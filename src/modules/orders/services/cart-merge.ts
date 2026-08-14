import { prisma } from "@/shared/db/prisma";

import {
  findOpenCartLinesForMerge,
  touchCart,
  upsertCartItemsInTransaction,
} from "../repositories/cart-repository";
import { MAX_CART_QUANTITY } from "../types";

/**
 * Prefer the customer's open cart. Fold guest lines in (sum quantities),
 * then abandon the guest cart. No-op when there is no guest cart.
 */
export async function mergeGuestCartIntoCustomer(input: {
  tenantId: string;
  guestToken: string | null | undefined;
  customerId: string;
}): Promise<void> {
  if (!input.guestToken) {
    return;
  }

  const [guestCart, customerCart] = await Promise.all([
    findOpenCartLinesForMerge(input.tenantId, { guestToken: input.guestToken }),
    findOpenCartLinesForMerge(input.tenantId, { customerId: input.customerId }),
  ]);

  if (!guestCart) {
    return;
  }

  if (guestCart.customerId === input.customerId) {
    return;
  }

  if (!customerCart) {
    await prisma.cart.updateMany({
      where: { id: guestCart.id, tenantId: input.tenantId },
      data: {
        customerId: input.customerId,
        guestToken: null,
      },
    });
    await touchCart(input.tenantId, guestCart.id);
    return;
  }

  if (customerCart.id === guestCart.id) {
    return;
  }

  if (guestCart.items.length === 0) {
    await prisma.cart.updateMany({
      where: { id: guestCart.id, tenantId: input.tenantId },
      data: {
        status: "abandoned",
        guestToken: null,
      },
    });
    return;
  }

  const mergedLines = guestCart.items.map((item) => {
    const existing = customerCart.items.find((line) => line.productId === item.productId);
    return {
      productId: item.productId,
      quantity: Math.min(
        (existing?.quantity ?? 0) + item.quantity,
        MAX_CART_QUANTITY,
      ),
    };
  });

  await prisma.$transaction(async (tx) => {
    await upsertCartItemsInTransaction(tx, {
      tenantId: input.tenantId,
      cartId: customerCart.id,
      lines: mergedLines,
    });
    await tx.cart.updateMany({
      where: { id: guestCart.id, tenantId: input.tenantId },
      data: {
        status: "abandoned",
        guestToken: null,
      },
    });
    await tx.cart.updateMany({
      where: { id: customerCart.id, tenantId: input.tenantId },
      data: { updatedAt: new Date() },
    });
  });
}
