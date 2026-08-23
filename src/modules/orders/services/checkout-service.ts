import { Prisma as PrismaNamespace, type IdentityChannel } from "@prisma/client";
import { randomUUID } from "crypto";

import {
  createCustomerAddress,
  getOwnedActiveAddressOrThrow,
  listCustomerAddresses,
} from "@/modules/customers";
import {
  updateCustomerContact,
  upsertCustomerByPhone,
} from "@/modules/customers/repositories/customer-repository";
import { assertCheckoutOptions, getCheckoutSettings } from "@/modules/settings";
import { prisma } from "@/shared/db/prisma";
import { AppError, isAppError } from "@/shared/errors/app-error";

import {
  findOpenCheckoutCartInTransaction,
  type CheckoutCartWithItems,
} from "../repositories/cart-repository";
import {
  convertCartInTransaction,
  findOrderByConfirmationToken,
  findOrderByIdempotencyKey,
  findOwnedOrderByOrderNumber,
  toOrderConfirmation,
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
  channel?: IdentityChannel;
  referralCode?: string | null;
  customerDisplayName?: string | null;
  customerFirstName?: string | null;
  customerLastName?: string | null;
  customerPhone?: string | null;
  customerEmail?: string | null;
};

type DeliverySnapshot = {
  addressLine: string;
  addressLine2?: string;
  cityOrArea: string;
  provinceOrState?: string;
  postalCode?: string;
  countryCode?: string;
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientPhone?: string;
  addressLabel?: string;
  sourceAddressId?: string;
  deliveryInstructions?: string;
};

function computeLineItems(cart: CheckoutCartWithItems) {
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
        volumeSnapshot: item.product.volume,
        sellingUnitSnapshot: item.product.sellingUnit,
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

async function resolveDeliverySnapshot(
  context: PlaceStorefrontOrderContext,
  input: CheckoutInput,
): Promise<DeliverySnapshot | null> {
  if (input.fulfillmentMethod !== "delivery") {
    return null;
  }

  if (input.addressMode === "saved" && input.savedAddressId) {
    if (!context.cartIdentity.customerId) {
      throw new AppError("UNAUTHORIZED", "Sign in to use a saved address");
    }
    const address = await getOwnedActiveAddressOrThrow(
      context.tenantId,
      context.cartIdentity.customerId,
      input.savedAddressId,
    );
    return {
      addressLine: address.addressLine1,
      addressLine2: address.addressLine2 ?? undefined,
      cityOrArea: address.cityOrDistrict,
      provinceOrState: address.provinceOrState,
      postalCode: address.postalCode ?? undefined,
      countryCode: address.countryCode,
      recipientFirstName: address.recipientFirstName,
      recipientLastName: address.recipientLastName,
      recipientPhone: address.phone,
      addressLabel: address.label,
      sourceAddressId: address.id,
      deliveryInstructions: address.deliveryInstructions ?? undefined,
    };
  }

  if (!input.addressLine || !input.cityOrArea) {
    throw new AppError("VALIDATION", "Address is required for delivery");
  }

  const snapshot: DeliverySnapshot = {
    addressLine: input.addressLine,
    addressLine2: input.addressLine2,
    cityOrArea: input.cityOrArea,
    provinceOrState: input.provinceOrState,
    postalCode: input.postalCode,
    countryCode: input.countryCode ?? "KH",
    recipientFirstName: input.firstName,
    recipientLastName: input.lastName,
    recipientPhone: input.phone,
    addressLabel: input.addressLabel,
    deliveryInstructions: input.deliveryInstructions,
  };

  if (input.saveAddress && context.cartIdentity.customerId) {
    const saved = await createCustomerAddress(
      context.tenantId,
      context.cartIdentity.customerId,
      {
        label: input.addressLabel?.trim() || "Home",
        recipientFirstName: input.firstName?.trim() || input.displayName.split(" ")[0] || "Customer",
        recipientLastName:
          input.lastName?.trim() ||
          input.displayName.split(" ").slice(1).join(" ") ||
          "Customer",
        phone: input.phone,
        addressLine1: input.addressLine,
        addressLine2: input.addressLine2,
        cityOrDistrict: input.cityOrArea,
        provinceOrState: input.provinceOrState?.trim() || input.cityOrArea,
        postalCode: input.postalCode,
        countryCode: input.countryCode ?? "KH",
        deliveryInstructions: input.deliveryInstructions,
        isDefault: Boolean(input.setAddressAsDefault),
      },
    );
    snapshot.sourceAddressId = saved.id;
    snapshot.addressLabel = saved.label;
  }

  return snapshot;
}

export async function getCheckoutPreview(
  context: PlaceStorefrontOrderContext,
): Promise<CheckoutPreview | null> {
  const customerId = context.cartIdentity.customerId;

  const [summary, settings, savedAddresses] = await Promise.all([
    getCartSummary(context.cartIdentity, context.currency),
    getCheckoutSettings(context.tenantId),
    customerId
      ? listCustomerAddresses(context.tenantId, customerId)
      : Promise.resolve([]),
  ]);

  if (!summary || summary.itemCount === 0) {
    return null;
  }

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
    prefillFirstName: context.customerFirstName ?? null,
    prefillLastName: context.customerLastName ?? null,
    prefillPhone: context.customerPhone ?? null,
    prefillEmail: context.customerEmail ?? null,
    savedAddresses,
    defaultAddressId: savedAddresses.find((a) => a.isDefault)?.id ?? null,
    isAuthenticated: Boolean(customerId),
  };
}

/**
 * Storefront checkout adapter (web guest or Telegram-authenticated).
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

  // Delivery resolution + cart summary in parallel (settings validation needs subtotal).
  const [delivery, preview] = await Promise.all([
    resolveDeliverySnapshot(context, input),
    getCartSummary(context.cartIdentity, context.currency),
  ]);

  if (!preview || preview.itemCount === 0) {
    throw new AppError("VALIDATION", "Cart is empty");
  }

  // Validate settings + fees outside the interactive transaction so we don't
  // hold a pooled connection open during extra reads (avoids P2028 on poolers).
  const { deliveryFeeMinor, pickup, settings } = await assertCheckoutOptions(
    context.tenantId,
    {
      fulfillmentMethod: input.fulfillmentMethod,
      paymentMethod: input.paymentMethod,
      pickupLocationKey: input.pickupLocationKey,
      subtotalMinor: preview.subtotalMinor,
    },
  );

  try {
    return await prisma.$transaction(
      async (tx) => {
        const cart = await findOpenCheckoutCartInTransaction(tx, {
          tenantId: context.tenantId,
          customerId: context.cartIdentity.customerId,
          guestToken: context.cartIdentity.guestToken,
        });

        if (!cart || cart.items.length === 0) {
          throw new AppError("VALIDATION", "Cart is empty");
        }

        const { availableLines, subtotalMinor } = computeLineItems(cart);

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
          await tx.customer.updateMany({
            where: { id: customer.id, tenantId: context.tenantId },
            data: {
              firstName: input.firstName ?? undefined,
              lastName: input.lastName ?? undefined,
            },
          });
        } else {
          customer = await upsertCustomerByPhone(tx, {
            tenantId: context.tenantId,
            displayName: input.displayName,
            phone: input.phone,
            email: input.email,
          });
        }

        // Claim cart before insert so concurrent checkouts cannot both succeed.
        await convertCartInTransaction(tx, context.tenantId, cart.id, customer.id);

        const order = await createOrderInTransaction(tx, {
          tenantId: context.tenantId,
          tenantSlug: context.tenantSlug,
          customerId: customer.id,
          channel,
          currency: settings.currency,
          idempotencyKey: input.idempotencyKey,
          fulfillmentMethod: input.fulfillmentMethod,
          addressLine: delivery?.addressLine,
          addressLine2: delivery?.addressLine2,
          cityOrArea: delivery?.cityOrArea,
          provinceOrState: delivery?.provinceOrState,
          postalCode: delivery?.postalCode,
          countryCode: delivery?.countryCode,
          recipientFirstName: delivery?.recipientFirstName,
          recipientLastName: delivery?.recipientLastName,
          recipientPhone: delivery?.recipientPhone,
          addressLabel: delivery?.addressLabel,
          sourceAddressId: delivery?.sourceAddressId,
          deliveryInstructions: delivery?.deliveryInstructions,
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
            volumeSnapshot: line.volumeSnapshot,
            sellingUnitSnapshot: line.sellingUnitSnapshot,
            unitPriceMinor: line.unitPriceMinor,
            quantity: line.quantity,
            lineTotalMinor: line.lineTotalMinor,
          })),
        });

        return order;
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );
  } catch (error) {
    if (isAppError(error) && error.code === "CONFLICT") {
      const replay = await findOrderByIdempotencyKey(context.tenantId, input.idempotencyKey);
      if (replay) {
        return replay;
      }
    }
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

/**
 * Load order confirmation for an authorized viewer.
 * Requires confirmation token match OR owning customer session.
 * Never exposes confirmationToken in the returned DTO.
 */
export async function getAuthorizedOrderConfirmation(input: {
  tenantId: string;
  orderNumber: string;
  confirmationToken?: string | null;
  customerId?: string | null;
}): Promise<OrderConfirmation | null> {
  if (input.confirmationToken) {
    const byToken = await findOrderByConfirmationToken(
      input.tenantId,
      input.orderNumber,
      input.confirmationToken,
    );
    if (byToken) {
      return toOrderConfirmation(byToken);
    }
  }

  if (input.customerId) {
    const owned = await findOwnedOrderByOrderNumber(
      input.tenantId,
      input.customerId,
      input.orderNumber,
    );
    if (owned) {
      return toOrderConfirmation(owned);
    }
  }

  return null;
}

/** @deprecated Always returns null — use getAuthorizedOrderConfirmation. */
export async function getOrderConfirmation(
  _tenantId: string,
  _orderNumber: string,
): Promise<OrderConfirmation | null> {
  void _tenantId;
  void _orderNumber;
  return null;
}
