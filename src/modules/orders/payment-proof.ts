import type { PaymentMethod, PaymentProofStatus } from "@prisma/client";

/** Browser `accept` attribute for customer uploads — matches server mime checks. */
export const PAYMENT_PROOF_ACCEPT = "image/png,image/jpeg,image/webp";

/** Customer-facing file requirement copy — matches server validation. */
export const PAYMENT_PROOF_REQUIREMENTS_LABEL =
  "Accepted files: JPG, PNG, or WEBP · Maximum 5 MB";

export function initialPaymentProofStatus(method: PaymentMethod): PaymentProofStatus {
  return method === "aba_transfer" ? "awaiting_proof" : "not_required";
}

export function customerCanUploadPaymentProof(input: {
  paymentMethod: PaymentMethod;
  paymentProofStatus: PaymentProofStatus;
}): boolean {
  if (input.paymentMethod !== "aba_transfer") {
    return false;
  }
  return (
    input.paymentProofStatus === "awaiting_proof" || input.paymentProofStatus === "rejected"
  );
}

/** Admin-facing short labels. */
export function paymentProofStatusLabel(status: PaymentProofStatus): string {
  switch (status) {
    case "not_required":
      return "Not required";
    case "awaiting_proof":
      return "Not submitted";
    case "submitted":
      return "Submitted";
    case "verified":
      return "Verified";
    case "rejected":
      return "Rejected";
    default:
      return status;
  }
}

/** Customer-facing payment confirmation status copy. */
export function customerPaymentConfirmationCopy(status: PaymentProofStatus): {
  title: string;
  body: string;
} {
  switch (status) {
    case "awaiting_proof":
      return {
        title: "Payment Confirmation Needed",
        body: "Please upload a screenshot or photo of your successful ABA transfer so our team can verify your payment.",
      };
    case "submitted":
      return {
        title: "Payment Confirmation Submitted",
        body: "Your payment confirmation has been uploaded and is waiting for verification.",
      };
    case "verified":
      return {
        title: "Payment Verified",
        body: "Your ABA payment has been verified.",
      };
    case "rejected":
      return {
        title: "Payment Confirmation Needs Attention",
        body: "We couldn't verify the payment confirmation you uploaded. Please upload a new screenshot or photo of the successful ABA transfer.",
      };
    case "not_required":
    default:
      return {
        title: "Payment",
        body: "",
      };
  }
}

export function customerPaymentConfirmationUploadLabel(status: PaymentProofStatus): string {
  return status === "rejected"
    ? "Upload New Payment Confirmation"
    : "Upload Payment Confirmation";
}

export function mapCustomerPaymentUploadError(message: string): string {
  const lower = message.toLowerCase();
  if (lower.includes("5 mb") || lower.includes("too large") || lower.includes("smaller")) {
    return "This file is too large. Please choose a smaller file.";
  }
  if (
    lower.includes("png") ||
    lower.includes("jpg") ||
    lower.includes("jpeg") ||
    lower.includes("webp") ||
    lower.includes("supported")
  ) {
    return "Please upload a supported image file.";
  }
  if (
    lower.includes("choose") ||
    lower.includes("required") ||
    lower.includes("empty") ||
    lower.includes("screenshot")
  ) {
    return "Please choose a payment confirmation file to upload.";
  }
  if (lower.includes("already on file") || lower.includes("conflict")) {
    return "A payment confirmation is already on file for this order.";
  }
  return "We couldn't upload your payment confirmation. Please try again.";
}
