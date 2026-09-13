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
    locale === "km"
      ? "ការបញ្ជាទិញបានដាក់ ✅"
      : locale === "zh"
        ? "订单已提交 ✅"
        : "Order Placed ✅",
    "",
    locale === "km"
      ? `យើងបានទទួលការបញ្ជាទិញ #${input.orderNumber} របស់អ្នក។`
      : locale === "zh"
        ? `我们已收到您的订单 #${input.orderNumber}。`
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
        : locale === "zh"
          ? "支付确认仍待提交。"
          : "Payment confirmation is still awaiting submission.",
    );
  }

  lines.push(
    "",
    locale === "km"
      ? "យើងនឹងជូនដំណឹងម្តងទៀតនៅពេលការបញ្ជាទិញត្រូវបានបញ្ជាក់។"
      : locale === "zh"
        ? "订单确认后我们会再次通知您。"
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
      : locale === "zh"
        ? [
            "支付已确认 ✅",
            "",
            `订单 #${input.orderNumber} 的付款已成功核实。`,
            "",
            "您的订单已确认，将继续处理。",
            "",
            "感谢您的订购。",
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
      : locale === "zh"
        ? [
            "支付凭证需要处理",
            "",
            `我们无法核实订单 #${input.orderNumber} 的支付凭证。`,
            "",
            "原因：",
            input.reason,
            "",
            "请打开订单并重新上传支付凭证。",
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
    buttonText:
      locale === "km"
        ? "បង្ហោះការបញ្ជាក់ថ្មី"
        : locale === "zh"
          ? "重新上传凭证"
          : "Upload New Proof",
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
