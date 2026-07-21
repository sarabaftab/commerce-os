import { Prisma as PrismaNamespace } from "@prisma/client";
import { randomUUID } from "crypto";

import { upsertCustomerByPhone } from "@/modules/customers/repositories/customer-repository";
import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import { findOpenCartByGuestTokenInTransaction } from "../repositories/cart-repository";
import {
  convertCartInTransaction,
  findOrderByIdempotencyKey,
  findOrderByOrderNumber,
} from "../repositories/order-repository";
import type { CheckoutInput } from "../schemas/checkout";
import { parseCheckoutConfig } from "../schemas/checkout-config";
import type { CheckoutPreview, OrderConfirmation } from "../types";
import type { CartIdentity } from "./cart-service";
import { getCartSummary } from "./cart-service";
import { createOrderInTransaction } from "./order-service";

type PlaceGuestOrderContext = {
  tenantId: string;
  tenantSlug: string;
  currency: string;
  tenantConfig: unknown;
  cartIdentity: CartIdentity;
};

type CartWithProducts = NonNullable<
  Awaited<ReturnType<typeof findOpenCartByGuestTokenInTransaction>>
>;

function computeLineItems(cart: CartWithProducts) {
  const lines = cart.items
    .filter((item) => item.product && !item.product.deletedAt)
    .map((item) => {
      const available = item.product.isAvailable;
      const unitPriceMinor = item.product.priceMinor;
      const lineTotalMinor = available ? unitPriceMinor * item.quantity : 0;

      return {
        cartItemId: item.id,
        productId: item.productId,
        name: item.product.name,
        quantity: item.quantity,
        unitPriceMinor,
        lineTotalMinor,
        isAvailable: available,
      };
    });

  const availableLines = lines.filter((line) => line.isAvailable);

  if (availableLines.length === 0) {
    throw new AppError("VALIDATION", "Cart has no available items");
  }

  if (availableLines.length !== lines.length) {
    throw new AppError("VALIDATION", "Remove unavailable items before checkout");
  }

  const subtotalMinor = availableLines.reduce((sum, line) => sum + line.lineTotalMinor, 0);

  return { availableLines, subtotalMinor };
}

export async function getCheckoutPreview(
  context: PlaceGuestOrderContext,
): Promise<CheckoutPreview | null> {
  const summary = await getCartSummary(context.cartIdentity, context.currency);
  if (!summary || summary.itemCount === 0) {
    return null;
  }

  const checkoutConfig = parseCheckoutConfig(context.tenantConfig);

  return {
    cart: summary,
    idempotencyKey: randomUUID(),
    deliveryFeeMinor: checkoutConfig.deliveryFeeMinor,
    abaInstructions: checkoutConfig.abaInstructions,
    pickupLocations: checkoutConfig.pickupLocations,
  };
}

/**
 * Guest web checkout adapter: resolve cart + customer, then call the shared
 * `createOrderInTransaction` application path. Recurring / Telegram / WhatsApp
 * flows should call `createOrder` / `createOrderInTransaction` directly.
 */
export async function placeGuestOrder(
  context: PlaceGuestOrderContext,
  input: CheckoutInput,
): Promise<OrderConfirmation> {
  const existing = await findOrderByIdempotencyKey(context.tenantId, input.idempotencyKey);
  if (existing) {
    return existing;
  }

  const checkoutConfig = parseCheckoutConfig(context.tenantConfig);

  if (input.fulfillmentMethod === "pickup") {
    const location = checkoutConfig.pickupLocations.find(
      (loc) => loc.id === input.pickupLocationKey,
    );
    if (!location) {
      throw new AppError("VALIDATION", "Invalid pickup location");
    }
  }

  const pickupLocation =
    input.fulfillmentMethod === "pickup"
      ? checkoutConfig.pickupLocations.find((loc) => loc.id === input.pickupLocationKey)
      : undefined;

  const deliveryFeeMinor =
    input.fulfillmentMethod === "delivery" ? checkoutConfig.deliveryFeeMinor : 0;

  if (!context.cartIdentity.guestToken && !context.cartIdentity.customerId) {
    throw new AppError("VALIDATION", "Cart not found");
  }

  try {
    return await prisma.$transaction(async (tx) => {
      let cart: CartWithProducts | null = null;

      if (context.cartIdentity.customerId) {
        cart = await tx.cart.findFirst({
          where: {
            tenantId: context.tenantId,
            customerId: context.cartIdentity.customerId,
            status: "open",
          },
          include: {
            items: {
              include: {
                product: {
                  include: {
                    media: { orderBy: { sortOrder: "asc" }, take: 1 },
                  },
                },
              },
              orderBy: { createdAt: "asc" },
            },
          },
        });
      } else if (context.cartIdentity.guestToken) {
        cart = await findOpenCartByGuestTokenInTransaction(
          tx,
          context.tenantId,
          context.cartIdentity.guestToken,
        );
      }

      if (!cart || cart.items.length === 0) {
        throw new AppError("VALIDATION", "Cart is empty");
      }

      const { availableLines, subtotalMinor } = computeLineItems(cart);
      const discountMinor = 0;
      const totalMinor = subtotalMinor - discountMinor + deliveryFeeMinor;

      const customer = await upsertCustomerByPhone(tx, {
        tenantId: context.tenantId,
        displayName: input.displayName,
        phone: input.phone,
        email: input.email,
      });

      const order = await createOrderInTransaction(tx, {
        tenantId: context.tenantId,
        tenantSlug: context.tenantSlug,
        customerId: customer.id,
        channel: "web",
        currency: context.currency,
        idempotencyKey: input.idempotencyKey,
        fulfillmentMethod: input.fulfillmentMethod,
        addressLine: input.fulfillmentMethod === "delivery" ? input.addressLine : undefined,
        cityOrArea: input.fulfillmentMethod === "delivery" ? input.cityOrArea : undefined,
        deliveryInstructions:
          input.fulfillmentMethod === "delivery" ? input.deliveryInstructions : undefined,
        pickupLocationKey:
          input.fulfillmentMethod === "pickup" ? input.pickupLocationKey : undefined,
        pickupLocationName:
          input.fulfillmentMethod === "pickup" ? pickupLocation?.name : undefined,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        subtotalMinor,
        deliveryFeeMinor,
        discountMinor,
        totalMinor,
        items: availableLines.map((line) => ({
          productId: line.productId,
          nameSnapshot: line.name,
          unitPriceMinor: line.unitPriceMinor,
          quantity: line.quantity,
          lineTotalMinor: line.lineTotalMinor,
        })),
      });

      await convertCartInTransaction(tx, context.tenantId, cart.id, customer.id);

      return order;
    });
  } catch (error) {
    if (
      error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const replay = await findOrderByIdempotencyKey(context.tenantId, input.idempotencyKey);
      if (replay) {
        return replay;
      }
    }
    throw error;
  }
}

export async function getOrderConfirmation(
  tenantId: string,
  orderNumber: string,
): Promise<OrderConfirmation | null> {
  return findOrderByOrderNumber(tenantId, orderNumber);
}
