import {
  buildActiveBuyOneGetOneByProductId,
  type ActiveBuyOneGetOne,
} from "@/modules/promotions/discount";
import { listActivePromotionsForTenant } from "@/modules/promotions/repositories/promotion-repository";
import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import {
  isProductPurchasable,
  maxPurchasableQuantity,
} from "../line-promotion";
import {
  clearCartItems,
  findCartById,
  touchCart,
  upsertCartItem,
} from "../repositories/cart-repository";
import { MAX_CART_QUANTITY } from "../types";
import { getOrCreateCart, type CartIdentity } from "./cart-service";

export type ReorderSkippedLine = {
  productId: string | null;
  name: string;
  reason: "missing_product" | "unavailable" | "out_of_stock";
};

export type RebuildCartFromOrderResult = {
  orderNumber: string;
  addedCount: number;
  skipped: ReorderSkippedLine[];
};

async function loadBogoMap(tenantId: string): Promise<Map<string, ActiveBuyOneGetOne>> {
  const promotions = await listActivePromotionsForTenant(tenantId);
  return buildActiveBuyOneGetOneByProductId(promotions);
}

/**
 * Replace the customer's open cart with available lines from a prior order they own.
 * Uses current stock/availability and pricing (via live product rows); never auto-checkouts.
 */
export async function rebuildCartFromCustomerOrder(input: {
  identity: CartIdentity;
  tenantCurrency: string;
  orderNumber: string;
}): Promise<RebuildCartFromOrderResult> {
  if (!input.identity.customerId) {
    throw new AppError("UNAUTHORIZED", "Sign in to reorder");
  }

  const order = await prisma.order.findFirst({
    where: {
      tenantId: input.identity.tenantId,
      customerId: input.identity.customerId,
      orderNumber: input.orderNumber,
    },
    select: {
      id: true,
      orderNumber: true,
      items: {
        orderBy: { id: "asc" },
        select: {
          productId: true,
          nameSnapshot: true,
          quantity: true,
        },
      },
    },
  });

  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found");
  }

  const productIds = order.items
    .map((item) => item.productId)
    .filter((id): id is string => Boolean(id));

  const [products, bogoMap, openCart] = await Promise.all([
    productIds.length
      ? prisma.product.findMany({
          where: {
            tenantId: input.identity.tenantId,
            id: { in: productIds },
          },
          select: {
            id: true,
            isAvailable: true,
            deletedAt: true,
            stockQuantity: true,
          },
        })
      : Promise.resolve([]),
    loadBogoMap(input.identity.tenantId),
    getOrCreateCart(input.identity, input.tenantCurrency),
  ]);

  const productById = new Map(products.map((row) => [row.id, row]));
  const skipped: ReorderSkippedLine[] = [];
  const additions = new Map<string, number>();

  for (const item of order.items) {
    if (!item.productId) {
      skipped.push({
        productId: null,
        name: item.nameSnapshot,
        reason: "missing_product",
      });
      continue;
    }
    const product = productById.get(item.productId);
    if (!product || product.deletedAt) {
      skipped.push({
        productId: item.productId,
        name: item.nameSnapshot,
        reason: "missing_product",
      });
      continue;
    }
    const bogo = bogoMap.get(item.productId) ?? null;
    if (
      !isProductPurchasable(
        {
          isAvailable: product.isAvailable,
          deletedAt: product.deletedAt,
          stockQuantity: product.stockQuantity,
        },
        bogo,
      )
    ) {
      skipped.push({
        productId: item.productId,
        name: item.nameSnapshot,
        reason: product.stockQuantity === 0 ? "out_of_stock" : "unavailable",
      });
      continue;
    }

    const maxQty = maxPurchasableQuantity(
      {
        isAvailable: product.isAvailable,
        deletedAt: product.deletedAt,
        stockQuantity: product.stockQuantity,
      },
      bogo,
      MAX_CART_QUANTITY,
    );
    const quantity = Math.min(item.quantity, maxQty);
    if (quantity < 1) {
      skipped.push({
        productId: item.productId,
        name: item.nameSnapshot,
        reason: "out_of_stock",
      });
      continue;
    }

    const next = Math.min((additions.get(item.productId) ?? 0) + quantity, maxQty);
    additions.set(item.productId, next);
  }

  await clearCartItems(input.identity.tenantId, openCart.cart.id);

  for (const [productId, quantity] of additions) {
    await upsertCartItem({
      tenantId: input.identity.tenantId,
      cartId: openCart.cart.id,
      productId,
      quantity,
      skipCartCheck: true,
    });
  }
  await touchCart(input.identity.tenantId, openCart.cart.id);

  const refreshed = await findCartById(input.identity.tenantId, openCart.cart.id);
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "Cart not found");
  }

  return {
    orderNumber: order.orderNumber,
    addedCount: additions.size,
    skipped,
  };
}
