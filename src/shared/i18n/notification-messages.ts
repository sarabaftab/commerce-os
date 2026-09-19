import type { Locale } from "./locale";
import { DEFAULT_LOCALE, parseLocale } from "./locale";
import { t } from "./messages";

export type NotificationCopy = {
  text: string;
  buttonText: string;
};

function resolveLocale(locale: string | null | undefined): Locale {
  try {
    return parseLocale(locale);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export function buildLocalizedOrderPlacedMessage(input: {
  locale?: string | null;
  orderNumber: string;
  totalFormatted: string;
  fulfillmentLabel: string;
  paymentLabel: string;
  fulfillmentKind: "pickup" | "delivery";
  awaitingProof: boolean;
}): NotificationCopy {
  const locale = resolveLocale(input.locale);
  const fulfillmentWord =
    input.fulfillmentKind === "pickup" ? t(locale, "pickup") : t(locale, "delivery");

  const lines = [
    locale === "km" ? "ការបញ្ជាទិញបានដាក់ ✅" : "Order Placed ✅",
    "",
    locale === "km"
      ? `យើងបានទទួលការបញ្ជាទិញ #${input.orderNumber} របស់អ្នក។`
      : `We've received your order #${input.orderNumber}.`,
    "",
    `${t(locale, "total")}: ${input.totalFormatted}`,
    `${fulfillmentWord}: ${input.fulfillmentLabel}`,
    `${t(locale, "paymentMethod")}: ${input.paymentLabel}`,
  ];

  if (input.awaitingProof) {
    lines.push(
      "",
      locale === "km"
        ? "ការបញ្ជាក់ការបង់ប្រាក់នៅតែរង់ចាំការដាក់ស្នើ។"
        : "Payment confirmation is still awaiting submission.",
    );
  }

  lines.push(
    "",
    locale === "km"
      ? "យើងនឹងជូនដំណឹងម្តងទៀតនៅពេលការបញ្ជាទិញត្រូវបានបញ្ជាក់។"
      : "We'll notify you again once your order is confirmed.",
  );

  return { text: lines.join("\n"), buttonText: t(locale, "viewOrder") };
}

export function buildLocalizedPaymentVerifiedMessage(input: {
  locale?: string | null;
  orderNumber: string;
}): NotificationCopy {
  const locale = resolveLocale(input.locale);
  const text =
    locale === "km"
      ? [
          "បានបញ្ជាក់ការបង់ប្រាក់ ✅",
          "",
          `ការបង់ប្រាក់សម្រាប់ការបញ្ជាទិញ #${input.orderNumber} ត្រូវបានផ្ទៀងផ្ទាត់ដោយជោគជ័យ។`,
          "",
          "ការបញ្ជាទិញរបស់អ្នកត្រូវបានបញ្ជាក់ ហើយនឹងបន្តដំណើរការ។",
          "",
          "អរគុណសម្រាប់ការបញ្ជាទិញ។",
        ].join("\n")
      : [
          "Payment Confirmed ✅",
          "",
          `Your payment for order #${input.orderNumber} has been verified successfully.`,
          "",
          "Your order is now confirmed and will continue to processing.",
          "",
          "Thank you for your order.",
        ].join("\n");

  return { text, buttonText: t(locale, "viewOrder") };
}

export function buildLocalizedPaymentRejectedMessage(input: {
  locale?: string | null;
  orderNumber: string;
  reason: string;
}): NotificationCopy {
  const locale = resolveLocale(input.locale);
  const text =
    locale === "km"
      ? [
          "ការបញ្ជាក់ការបង់ប្រាក់ត្រូវការយកចិត្តទុកដាក់",
          "",
          `យើងមិនអាចផ្ទៀងផ្ទាត់ការបញ្ជាក់ការបង់ប្រាក់សម្រាប់ការបញ្ជាទិញ #${input.orderNumber} ទេ។`,
          "",
          "មូលហេតុ៖",
          input.reason,
          "",
          "សូមបើកការបញ្ជាទិញរបស់អ្នក ហើយបង្ហោះការបញ្ជាក់ការបង់ប្រាក់ថ្មី។",
        ].join("\n")
      : [
          "Payment Proof Needs Attention",
          "",
          `We could not verify the payment proof for order #${input.orderNumber}.`,
          "",
          "Reason:",
          input.reason,
          "",
          "Please open your order and upload a new payment proof.",
        ].join("\n");

  return {
    text,
    buttonText: locale === "km" ? "បង្ហោះការបញ្ជាក់ថ្មី" : "Upload New Proof",
  };
}

export function localizedFulfillmentLabel(
  locale: Locale,
  method: "delivery" | "pickup",
): string {
  return method === "pickup" ? t(locale, "showroomPickup") : t(locale, "homeDelivery");
}

export function localizedPaymentLabel(
  locale: Locale,
  method: "cod" | "aba_transfer",
): string {
  return method === "aba_transfer" ? t(locale, "abaTransfer") : t(locale, "cashOnDelivery");
}

export type NotifiableOrderStatusForCopy =
  | "confirmed"
  | "processing"
  | "ready_for_pickup"
  | "out_for_delivery"
  | "completed"
  | "cancelled";

/**
 * Customer Telegram copy for admin-triggered order status changes.
 * Locale must come from order.customerLocale (via resolveLocale).
 */
export function buildLocalizedOrderStatusMessage(input: {
  locale?: string | null;
  orderNumber: string;
  toStatus: NotifiableOrderStatusForCopy;
  fulfillmentMethod: "delivery" | "pickup";
  pickupLocationName?: string | null;
  pickupLocationAddress?: string | null;
}): NotificationCopy {
  const locale = resolveLocale(input.locale);
  const n = input.orderNumber;
  const buttonText = t(locale, "viewOrder");

  const pickupSuffix = (() => {
    if (input.fulfillmentMethod !== "pickup") {
      return "";
    }
    const bits = [input.pickupLocationName, input.pickupLocationAddress].filter(
      (value): value is string => Boolean(value?.trim()),
    );
    if (bits.length === 0) {
      return "";
    }
    const label = locale === "km" ? "ទទួលដោយខ្លួនឯង" : "Pickup";
    return `\n\n${label}: ${bits.join(" — ")}`;
  })();

  if (locale === "km") {
    switch (input.toStatus) {
      case "confirmed":
        return {
          text: `ការបញ្ជាទិញ #${n} ត្រូវបានបញ្ជាក់\n\nការបញ្ជាទិញរបស់អ្នកត្រូវបានបញ្ជាក់ ហើយកំពុងត្រូវបានរៀបចំ។`,
          buttonText,
        };
      case "processing":
        return {
          text: `ការបញ្ជាទិញ #${n} កំពុងត្រូវបានរៀបចំ\n\nយើងកំពុងរៀបចំការបញ្ជាទិញរបស់អ្នក។`,
          buttonText,
        };
      case "ready_for_pickup":
        return {
          text: `ការបញ្ជាទិញ #${n} រួចរាល់សម្រាប់ទទួល\n\nការបញ្ជាទិញរបស់អ្នករួចរាល់នៅទីតាំងទទួលដែលអ្នកបានជ្រើសរើស។${pickupSuffix}`,
          buttonText,
        };
      case "out_for_delivery":
        return {
          text: `ការបញ្ជាទិញ #${n} កំពុងដឹកជញ្ជូន\n\nការបញ្ជាទិញរបស់អ្នកកំពុងមកដល់។`,
          buttonText,
        };
      case "completed":
        return {
          text: `ការបញ្ជាទិញ #${n} បានបញ្ចប់\n\nការបញ្ជាទិញរបស់អ្នកបានបញ្ចប់។ អរគុណសម្រាប់ការបញ្ជាទិញ។`,
          buttonText,
        };
      case "cancelled":
        return {
          text: `ការបញ្ជាទិញ #${n} បានលុបចោល\n\nការបញ្ជាទិញរបស់អ្នកត្រូវបានលុបចោល។`,
          buttonText,
        };
      default: {
        const _never: never = input.toStatus;
        return _never;
      }
    }
  }

  switch (input.toStatus) {
    case "confirmed":
      return {
        text: `Order #${n} confirmed\n\nYour order has been confirmed and is now being prepared.`,
        buttonText,
      };
    case "processing":
      return {
        text: `Order #${n} is being prepared\n\nWe are currently preparing your order.`,
        buttonText,
      };
    case "ready_for_pickup":
      return {
        text: `Order #${n} is ready for pickup\n\nYour order is ready at your selected pickup location.${pickupSuffix}`,
        buttonText,
      };
    case "out_for_delivery":
      return {
        text: `Order #${n} is out for delivery\n\nYour order is on the way.`,
        buttonText,
      };
    case "completed":
      return {
        text: `Order #${n} completed\n\nYour order has been completed. Thank you for ordering with us.`,
        buttonText,
      };
    case "cancelled":
      return {
        text: `Order #${n} cancelled\n\nYour order has been cancelled.`,
        buttonText,
      };
    default: {
      const _never: never = input.toStatus;
      return _never;
    }
  }
}
