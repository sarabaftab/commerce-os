import type { FulfillmentMethod, OrderStatus } from "@prisma/client";

export const ORDER_STATUS_NOTIFICATION_STATUSES = [
  "confirmed",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
  "completed",
  "cancelled",
] as const satisfies readonly OrderStatus[];

export type NotifiableOrderStatus = (typeof ORDER_STATUS_NOTIFICATION_STATUSES)[number];

export function shouldNotifyOrderStatus(status: OrderStatus): status is NotifiableOrderStatus {
  return (ORDER_STATUS_NOTIFICATION_STATUSES as readonly string[]).includes(status);
}

export type OrderStatusMessageInput = {
  orderNumber: string;
  storeName: string;
  toStatus: NotifiableOrderStatus;
  fulfillmentMethod: FulfillmentMethod;
  pickupLocationName: string | null;
  pickupLocationAddress: string | null;
};

export type OrderStatusTelegramMessage = {
  text: string;
  buttonText: string;
};

function pickupLines(input: OrderStatusMessageInput): string {
  if (input.fulfillmentMethod !== "pickup") {
    return "";
  }
  const bits = [input.pickupLocationName, input.pickupLocationAddress].filter(
    (value): value is string => Boolean(value?.trim()),
  );
  if (bits.length === 0) {
    return "";
  }
  return `\n\nPickup: ${bits.join(" — ")}`;
}

export function buildOrderStatusTelegramMessage(
  input: OrderStatusMessageInput,
): OrderStatusTelegramMessage {
  const n = input.orderNumber;
  switch (input.toStatus) {
    case "confirmed":
      return {
        text: `Order #${n} confirmed\n\nYour order has been confirmed and is now being prepared.`,
        buttonText: "View Order",
      };
    case "processing":
      return {
        text: `Order #${n} is being prepared\n\nWe are currently preparing your order.`,
        buttonText: "View Order",
      };
    case "ready_for_pickup":
      return {
        text: `Order #${n} is ready for pickup\n\nYour order is ready at your selected pickup location.${pickupLines(input)}`,
        buttonText: "View Order",
      };
    case "out_for_delivery":
      return {
        text: `Order #${n} is out for delivery\n\nYour order is on the way.`,
        buttonText: "View Order",
      };
    case "completed":
      return {
        text: `Order #${n} completed\n\nYour order has been completed. Thank you for ordering with us.`,
        buttonText: "View Order",
      };
    case "cancelled":
      return {
        text: `Order #${n} cancelled\n\nYour order has been cancelled.`,
        buttonText: "View Order",
      };
    default: {
      const _never: never = input.toStatus;
      return _never;
    }
  }
}

export function buildAccountOrderWebAppUrl(input: {
  appUrl: string;
  tenantSlug: string;
  orderNumber: string;
}): string {
  const base = input.appUrl.replace(/\/$/, "");
  return `${base}/${input.tenantSlug}/account/orders/${encodeURIComponent(input.orderNumber)}`;
}
