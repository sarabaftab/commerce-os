import type {
  FulfillmentMethod,
  OrderStatus,
  PaymentMethod,
  PaymentProofStatus,
} from "@prisma/client";

import { buildLocalizedOrderStatusMessage } from "@/shared/i18n";
import { formatMoney } from "@/shared/money/money";

export const ORDER_STATUS_NOTIFICATION_STATUSES = [
  "confirmed",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const satisfies readonly OrderStatus[];

export type NotifiableOrderStatus = (typeof ORDER_STATUS_NOTIFICATION_STATUSES)[number];

/**
 * Status-change notifications only. Order placement uses `toStatus: pending`
 * via a dedicated enqueue path — not through this list.
 */
export function shouldNotifyOrderStatus(status: OrderStatus): status is NotifiableOrderStatus {
  return (ORDER_STATUS_NOTIFICATION_STATUSES as readonly string[]).includes(status);
}

export function customerFulfillmentLabel(method: FulfillmentMethod): string {
  return method === "pickup" ? "Showroom Pickup" : "Home Delivery";
}

export function customerPaymentLabel(method: PaymentMethod): string {
  return method === "aba_transfer" ? "ABA Bank Transfer" : "Cash on Delivery";
}

export type OrderStatusMessageInput = {
  orderNumber: string;
  storeName: string;
  toStatus: NotifiableOrderStatus;
  fulfillmentMethod: FulfillmentMethod;
  pickupLocationName: string | null;
  pickupLocationAddress: string | null;
  /** Authoritative order.customerLocale when available. Defaults to English. */
  locale?: string | null;
};

export type OrderPlacedMessageInput = {
  orderNumber: string;
  totalMinor: number;
  currency: string;
  fulfillmentMethod: FulfillmentMethod;
  paymentMethod: PaymentMethod;
  paymentProofStatus: PaymentProofStatus;
};

export type OrderStatusTelegramMessage = {
  text: string;
  buttonText: string;
};

/** Customer Telegram copy for successful order creation (`toStatus: pending`). */
export function buildOrderPlacedTelegramMessage(
  input: OrderPlacedMessageInput,
): OrderStatusTelegramMessage {
  const fulfillment = customerFulfillmentLabel(input.fulfillmentMethod);
  const payment = customerPaymentLabel(input.paymentMethod);
  const total = formatMoney(input.totalMinor, input.currency);
  const lines = [
    "Order Placed ✅",
    "",
    `We've received your order #${input.orderNumber}.`,
    "",
    `Total: ${total}`,
    `${input.fulfillmentMethod === "pickup" ? "Pickup" : "Delivery"}: ${fulfillment}`,
    `Payment: ${payment}`,
  ];

  if (
    input.paymentMethod === "aba_transfer" &&
    (input.paymentProofStatus === "awaiting_proof" ||
      input.paymentProofStatus === "rejected")
  ) {
    lines.push("", "Payment confirmation is still awaiting submission.");
  }

  lines.push("", "We'll notify you again once your order is confirmed.");

  return {
    text: lines.join("\n"),
    buttonText: "View Order",
  };
}

/**
 * Status-change Telegram copy. Prefer passing order.customerLocale.
 * English remains the fallback for null/invalid locales.
 */
export function buildOrderStatusTelegramMessage(
  input: OrderStatusMessageInput,
): OrderStatusTelegramMessage {
  return buildLocalizedOrderStatusMessage({
    locale: input.locale,
    orderNumber: input.orderNumber,
    toStatus: input.toStatus,
    fulfillmentMethod: input.fulfillmentMethod === "pickup" ? "pickup" : "delivery",
    pickupLocationName: input.pickupLocationName,
    pickupLocationAddress: input.pickupLocationAddress,
  });
}

export function buildAccountOrderWebAppUrl(input: {
  appUrl: string;
  tenantSlug: string;
  orderNumber: string;
}): string {
  const base = input.appUrl.replace(/\/$/, "");
  return `${base}/${input.tenantSlug}/account/orders/${encodeURIComponent(input.orderNumber)}`;
}
