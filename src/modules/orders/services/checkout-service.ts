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
import { parseOptionalLatLng } from "@/modules/locations/coordinates";
import {
  addressFieldsFromLocationResult,
  isPinnedLocationFallback,
  reverseGeocodeLatLng,
} from "@/modules/locations";
import { assertCheckoutOptions, getCheckoutSettings } from "@/modules/settings";
import { notifyOrderPlacedAfterCommit } from "@/modules/notifications/services/notification-service";
import {
  listActivePromotionsForTenant,
  pickEligibleCampaignDiscount,
  resolveCampaignDiscountForCheckout,
  buildActiveBuyOneGetOneByProductId,
  type ActiveBuyOneGetOne,
} from "@/modules/promotions";
import { deductProductStockInTransaction } from "@/modules/promotions/repositories/promotion-repository";
import { prisma } from "@/shared/db/prisma";
import { AppError, isAppError } from "@/shared/errors/app-error";
import { formatPhoneForDisplay } from "@/shared/phone/normalize-phone";

import {
  isProductPurchasable,
  maxPurchasableQuantity,
  resolveLinePromotionQuantities,
} from "../line-promotion";
import {
  assertCashOnDeliveryAllowed,
  merchandiseSubtotalAfterDiscountMinor,
} from "../cod-eligibility";
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
import { MAX_CART_QUANTITY } from "../types";
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
  latitude?: number | null;
  longitude?: number | null;
};

function computeLineItems(
  cart: CheckoutCartWithItems,
  bogoByProductId: Map<string, ActiveBuyOneGetOne>,
) {
  const lines = cart.items
    .filter((item) => item.product && !item.product.deletedAt)
    .map((item) => {
      const bogo = bogoByProductId.get(item.productId) ?? null;
      const available = isProductPurchasable(
        {
          isAvailable: item.product.isAvailable,
          deletedAt: item.product.deletedAt,
          stockQuantity: item.product.stockQuantity,
        },
        bogo,
      );
      const maxQty = maxPurchasableQuantity(
        {
          isAvailable: item.product.isAvailable,
          deletedAt: item.product.deletedAt,
          stockQuantity: item.product.stockQuantity,
        },
        bogo,
        MAX_CART_QUANTITY,
      );
      if (available && item.quantity > maxQty) {
        throw new AppError(
          "VALIDATION",
          `Not enough stock for ${item.product.name}`,
        );
      }

      const unitPriceMinor = item.product.priceMinor;
      const resolved = available
        ? resolveLinePromotionQuantities({
            paidQuantity: item.quantity,
            unitPriceMinor,
            bogo,
          })
        : {
            paidQuantity: item.quantity,
            freeQuantity: 0,
            fulfillmentQuantity: item.quantity,
            promotionIdSnapshot: null as string | null,
            promotionNameSnapshot: null as string | null,
            promotionTypeSnapshot: null as string | null,
            lineTotalMinor: 0,
          };

      return {
        cartItemId: item.id,
        productId: item.productId,
        name: item.product.name,
        quantity: resolved.paidQuantity,
        freeQuantity: resolved.freeQuantity,
        fulfillmentQuantity: resolved.fulfillmentQuantity,
        promotionIdSnapshot: resolved.promotionIdSnapshot,
        promotionNameSnapshot: resolved.promotionNameSnapshot,
        promotionTypeSnapshot: resolved.promotionTypeSnapshot,
        unitPriceMinor,
        lineTotalMinor: resolved.lineTotalMinor,
        isAvailable: available,
        volumeSnapshot: item.product.volume,
        sellingUnitSnapshot: item.product.sellingUnit,
        stockQuantity: item.product.stockQuantity,
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
    const savedPin = parseOptionalLatLng(address.latitude, address.longitude);
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
      latitude: savedPin?.latitude ?? null,
      longitude: savedPin?.longitude ?? null,
    };
  }

  if (!input.addressLine || !input.cityOrArea) {
    throw new AppError("VALIDATION", "Address is required for delivery");
  }

  const pin = parseOptionalLatLng(input.deliveryLatitude, input.deliveryLongitude);
  let addressLine = input.addressLine;
  let cityOrArea = input.cityOrArea;
  let provinceOrState = input.provinceOrState;
  let postalCode = input.postalCode;
  let countryCode = input.countryCode ?? "KH";

  // Resolve pin → text once at checkout when the customer only confirmed coordinates
  // (or still has the placeholder). Never block order placement on geocoding failure.
  if (pin && isPinnedLocationFallback(addressLine)) {
    const resolved = await reverseGeocodeLatLng(pin);
    if (resolved) {
      const fields = addressFieldsFromLocationResult(resolved);
      addressLine = fields.addressLine;
      if (fields.cityOrArea) {
        cityOrArea = fields.cityOrArea;
      }
      if (fields.provinceOrState) {
        provinceOrState = fields.provinceOrState;
      }
      if (fields.postalCode) {
        postalCode = fields.postalCode;
      }
      if (fields.countryCode) {
        countryCode = fields.countryCode;
      }
    }
  }

  const snapshot: DeliverySnapshot = {
    addressLine,
    addressLine2: input.addressLine2,
    cityOrArea,
    provinceOrState,
    postalCode,
    countryCode,
    recipientFirstName: input.firstName,
    recipientLastName: input.lastName,
    recipientPhone: input.phone,
    addressLabel: input.addressLabel,
    deliveryInstructions: input.deliveryInstructions,
    latitude: pin?.latitude ?? null,
    longitude: pin?.longitude ?? null,
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
        addressLine1: addressLine,
        addressLine2: input.addressLine2,
        cityOrDistrict: cityOrArea,
        provinceOrState: provinceOrState?.trim() || cityOrArea,
        postalCode,
        countryCode,
        deliveryInstructions: input.deliveryInstructions,
        isDefault: Boolean(input.setAddressAsDefault),
        latitude: pin?.latitude ?? null,
        longitude: pin?.longitude ?? null,
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

  const campaign = await resolveCampaignDiscountForCheckout({
    tenantId: context.tenantId,
    subtotalMinor: summary.subtotalMinor,
  });

  return {
    cart: summary,
    idempotencyKey: randomUUID(),
    currency: settings.currency,
    deliveryEnabled: settings.deliveryEnabled,
    pickupEnabled: settings.pickupEnabled,
    deliveryFeeMinor: previewDeliveryFee,
    discountMinor: campaign?.discountMinor ?? 0,
    promotionName: campaign?.promotionName ?? null,
    promotionType:
      campaign?.type === "percentage" || campaign?.type === "fixed"
        ? campaign.type
        : null,
    promotionValue: campaign?.value ?? null,
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
    prefillPhone: context.customerPhone
      ? formatPhoneForDisplay(context.customerPhone)
      : null,
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
    await notifyOrderPlacedAfterCommit({
      tenantId: context.tenantId,
      orderId: existing.id,
    });
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
  const [{ deliveryFeeMinor, pickup, settings }, activePromotions] = await Promise.all([
    assertCheckoutOptions(context.tenantId, {
      fulfillmentMethod: input.fulfillmentMethod,
      paymentMethod: input.paymentMethod,
      pickupLocationKey: input.pickupLocationKey,
      subtotalMinor: preview.subtotalMinor,
    }),
    listActivePromotionsForTenant(context.tenantId),
  ]);

  // Early COD gate using the same merchandise formula (after discount, before delivery).
  // Authoritative re-check happens inside the transaction before stock/cart mutation.
  const previewCampaign = pickEligibleCampaignDiscount(activePromotions, {
    subtotalMinor: preview.subtotalMinor,
  });
  assertCashOnDeliveryAllowed({
    paymentMethod: input.paymentMethod,
    merchandiseSubtotalMinor: merchandiseSubtotalAfterDiscountMinor(
      preview.subtotalMinor,
      previewCampaign?.discountMinor ?? 0,
    ),
    currency: settings.currency,
    locale: input.customerLocale,
  });

  try {
    const order = await prisma.$transaction(
      async (tx) => {
        const cart = await findOpenCheckoutCartInTransaction(tx, {
          tenantId: context.tenantId,
          customerId: context.cartIdentity.customerId,
          guestToken: context.cartIdentity.guestToken,
        });

        if (!cart || cart.items.length === 0) {
          throw new AppError("VALIDATION", "Cart is empty");
        }

        const bogoByProductId = buildActiveBuyOneGetOneByProductId(activePromotions);
        const { availableLines, subtotalMinor } = computeLineItems(cart, bogoByProductId);

        // Pure in-memory resolve — never query prisma from inside this tx
        // (nested client calls on poolers expire interactive transactions).
        const campaign = pickEligibleCampaignDiscount(activePromotions, {
          subtotalMinor,
        });
        const discountMinor = campaign?.discountMinor ?? 0;
        const merchandiseSubtotalMinor = merchandiseSubtotalAfterDiscountMinor(
          subtotalMinor,
          discountMinor,
        );
        const totalMinor = merchandiseSubtotalMinor + deliveryFeeMinor;

        // Authoritative COD gate: reject before stock deduction or cart claim.
        assertCashOnDeliveryAllowed({
          paymentMethod: input.paymentMethod,
          merchandiseSubtotalMinor,
          currency: settings.currency,
          locale: input.customerLocale,
        });

        // Atomic stock deduction before claim/insert (fulfillment qty for 1+1).
        for (const line of availableLines) {
          if (line.stockQuantity == null) {
            continue;
          }
          const ok = await deductProductStockInTransaction(tx, {
            tenantId: context.tenantId,
            productId: line.productId,
            quantity: line.fulfillmentQuantity,
          });
          if (!ok) {
            throw new AppError(
              "CONFLICT",
              `Not enough stock for ${line.name}`,
            );
          }
        }

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

        return createOrderInTransaction(tx, {
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
          deliveryLatitude: delivery?.latitude ?? undefined,
          deliveryLongitude: delivery?.longitude ?? undefined,
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
          promotionId: campaign?.promotionId,
          promotionNameSnapshot: campaign?.promotionName,
          referralCode: context.referralCode ?? undefined,
          customerLocale: input.customerLocale ?? null,
          items: availableLines.map((line) => ({
            productId: line.productId,
            nameSnapshot: line.name,
            volumeSnapshot: line.volumeSnapshot,
            sellingUnitSnapshot: line.sellingUnitSnapshot,
            unitPriceMinor: line.unitPriceMinor,
            quantity: line.quantity,
            freeQuantity: line.freeQuantity,
            fulfillmentQuantity: line.fulfillmentQuantity,
            promotionIdSnapshot: line.promotionIdSnapshot,
            promotionNameSnapshot: line.promotionNameSnapshot,
            promotionTypeSnapshot: line.promotionTypeSnapshot,
            lineTotalMinor: line.lineTotalMinor,
          })),
        });
      },
      {
        maxWait: 10_000,
        timeout: 20_000,
      },
    );

    await notifyOrderPlacedAfterCommit({
      tenantId: context.tenantId,
      orderId: order.id,
    });
    return order;
  } catch (error) {
    if (isAppError(error) && error.code === "CONFLICT") {
      const replay = await findOrderByIdempotencyKey(context.tenantId, input.idempotencyKey);
      if (replay) {
        await notifyOrderPlacedAfterCommit({
          tenantId: context.tenantId,
          orderId: replay.id,
        });
        return replay;
      }
    }
    if (
      error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      const replay = await findOrderByIdempotencyKey(context.tenantId, input.idempotencyKey);
      if (replay) {
        await notifyOrderPlacedAfterCommit({
          tenantId: context.tenantId,
          orderId: replay.id,
        });
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
