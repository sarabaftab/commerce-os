import type { PaymentMethod, PaymentProofStatus } from "@prisma/client";

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

export function paymentProofStatusLabel(status: PaymentProofStatus): string {
  switch (status) {
    case "not_required":
      return "Not required";
    case "awaiting_proof":
      return "Awaiting screenshot";
    case "submitted":
      return "Submitted";
    case "verified":
      return "Verified";
    case "rejected":
      return "Needs a new screenshot";
    default:
      return status;
  }
}
