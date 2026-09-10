/**
 * Centralized Telegram copy for ABA payment-proof admin review outcomes.
 * Kept separate from order-status templates so localization can target these strings later.
 */

export type PaymentProofTelegramMessage = {
  text: string;
  buttonText: string;
};

const GENERIC_REJECTION_REASON =
  "Please upload a clearer screenshot of your successful ABA transfer.";

export function resolvePaymentProofRejectionReason(reason: string | null | undefined): string {
  const trimmed = reason?.trim();
  return trimmed ? trimmed : GENERIC_REJECTION_REASON;
}

/** Customer Telegram copy after Admin verifies an ABA payment proof. */
export function buildPaymentProofVerifiedTelegramMessage(input: {
  orderNumber: string;
}): PaymentProofTelegramMessage {
  return {
    text: [
      "Payment Confirmed ✅",
      "",
      `Your payment for order #${input.orderNumber} has been verified successfully.`,
      "",
      "Your order is now confirmed and will continue to processing.",
      "",
      "Thank you for your order.",
    ].join("\n"),
    buttonText: "View Order",
  };
}

/** Customer Telegram copy after Admin rejects an ABA payment proof. */
export function buildPaymentProofRejectedTelegramMessage(input: {
  orderNumber: string;
  rejectionReason?: string | null;
}): PaymentProofTelegramMessage {
  const reason = resolvePaymentProofRejectionReason(input.rejectionReason);
  return {
    text: [
      "Payment Proof Needs Attention",
      "",
      `We could not verify the payment proof for order #${input.orderNumber}.`,
      "",
      "Reason:",
      reason,
      "",
      "Please open your order and upload a new payment proof.",
    ].join("\n"),
    buttonText: "Upload New Proof",
  };
}
