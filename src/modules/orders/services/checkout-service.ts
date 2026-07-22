import { Prisma as PrismaNamespace, type IdentityChannel } from "@prisma/client";
import { randomUUID } from "crypto";

import {
  updateCustomerContact,
  upsertCustomerByPhone,
} from "@/modules/customers/repositories/customer-repository";
import { assertCheckoutOptions, getCheckoutSettings } from "@/modules/settings";
import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import { findOpenCartByGuestTokenInTransaction } from "../repositories/cart-repository";
import {
  convertCartInTransaction,
  findOrderByIdempotencyKey,
  findOrderByOrderNumber,
} from "../repositories/order-repository";
import type { CheckoutInput } from "../schemas/checkout";
import type { CheckoutPreview, OrderConfirmation } from "../types";
import type { CartIdentity } from "./cart-service";
import { getCartSummary } from "./cart-service";
import { createOrderInTransaction } from "./order-service";

type PlaceStorefrontOrderContext = {
  tenantId: string;
  tenantSlug: string;
  currency: string;
  cartIdentity: CartIdentity;
  /** Defaults to web when no authenticated customer session. */
  channel?: IdentityChannel;
  /** Opaque start_param / attribution — stored as referralCode, no referral logic. */
  referralCode?: string | null;
  /** Prefill-only; checkout still collects contact fields. */
  customerDisplayName?: string | null;
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
  context: PlaceStorefrontOrderContext,
): Promise<CheckoutPreview | null> {
  const summary = await getCartSummary(context.cartIdentity, context.currency);
  if (!summary || summary.itemCount === 0) {
    return null;
  }

  const settings = await getCheckoutSettings(context.tenantId);
  const previewDeliveryFee =
    settings.deliveryEnabled
      ? settings.freeDeliveryThresholdMinor != null &&
        summary.subtotalMinor >= settings.freeDeliveryThresholdMinor
        ? 0
        : settings.deliveryFeeMinor
      : 0;

  return {
    cart: summary,
    idempotencyKey: randomUUID(),
    currency: settings.currency,
    deliveryEnabled: settings.deliveryEnabled,
    pickupEnabled: settings.pickupEnabled,
    deliveryFeeMinor: previewDeliveryFee,
    freeDeliveryThresholdMinor: settings.freeDeliveryThresholdMinor,
    deliveryNotes: settings.deliveryNotes,
    pickupLocations: settings.activePickupLocations,
    codEnabled: settings.codEnabled,
    abaAvailable: settings.abaAvailable,
    abaInstructions: settings.abaInstructions,
    abaAccountName: settings.abaAccountName,
    abaAccountNumber: settings.abaAccountNumber,
    abaQrImageUrl: settings.abaQrImageUrl,
    abaCustomerNote: settings.abaCustomerNote,
    checkoutBlockedReason: settings.checkoutBlockedReason,
    prefillDisplayName: context.customerDisplayName ?? null,
  };
}

/**
 * Storefront checkout adapter (web guest or Telegram-authenticated).
 * Resolves cart + customer, then calls shared `createOrderInTransaction`.
 */
export async function placeGuestOrder(
  context: PlaceStorefrontOrderContext,
  input: CheckoutInput,
): Promise<OrderConfirmation> {
  const existing = await findOrderByIdempotencyKey(context.tenantId, input.idempotencyKey);
  if (existing) {
    return existing;
  }

  if (!context.cartIdentity.guestToken && !context.cartIdentity.customerId) {
    throw new AppError("VALIDATION", "Cart not found");
  }

  const channel: IdentityChannel = context.channel ?? "web";

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
      }

      if (!cart && context.cartIdentity.guestToken) {
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

      const { deliveryFeeMinor, pickup, settings } = await assertCheckoutOptions(
        context.tenantId,
        {
          fulfillmentMethod: input.fulfillmentMethod,
          paymentMethod: input.paymentMethod,
          pickupLocationKey: input.pickupLocationKey,
          subtotalMinor,
        },
      );

      const discountMinor = 0;
      const totalMinor = subtotalMinor - discountMinor + deliveryFeeMinor;

      let customer;
      if (context.cartIdentity.customerId) {
        customer = await updateCustomerContact(tx, {
          tenantId: context.tenantId,
          customerId: context.cartIdentity.customerId,
          displayName: input.displayName,
          phone: input.phone,
          email: input.email,
        });
      } else {
        customer = await upsertCustomerByPhone(tx, {
          tenantId: context.tenantId,
          displayName: input.displayName,
          phone: input.phone,
          email: input.email,
        });
      }

      const order = await createOrderInTransaction(tx, {
        tenantId: context.tenantId,
        tenantSlug: context.tenantSlug,
        customerId: customer.id,
        channel,
        currency: settings.currency,
        idempotencyKey: input.idempotencyKey,
        fulfillmentMethod: input.fulfillmentMethod,
        addressLine: input.fulfillmentMethod === "delivery" ? input.addressLine : undefined,
        cityOrArea: input.fulfillmentMethod === "delivery" ? input.cityOrArea : undefined,
        deliveryInstructions:
          input.fulfillmentMethod === "delivery" ? input.deliveryInstructions : undefined,
        pickupLocationKey: input.fulfillmentMethod === "pickup" ? pickup?.id : undefined,
        pickupLocationName: input.fulfillmentMethod === "pickup" ? pickup?.name : undefined,
        pickupLocationAddress:
          input.fulfillmentMethod === "pickup" ? pickup?.address : undefined,
        paymentMethod: input.paymentMethod,
        paymentReference: input.paymentReference,
        subtotalMinor,
        deliveryFeeMinor,
        discountMinor,
        totalMinor,
        referralCode: context.referralCode ?? undefined,
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
