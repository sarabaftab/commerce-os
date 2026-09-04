import { describe, expect, it } from "vitest";

import {
  customerCanUploadPaymentProof,
  customerPaymentConfirmationCopy,
  customerPaymentConfirmationUploadLabel,
  initialPaymentProofStatus,
  mapCustomerPaymentUploadError,
  paymentProofStatusLabel,
  PAYMENT_PROOF_REQUIREMENTS_LABEL,
} from "@/modules/orders/payment-proof";
import {
  detectPaymentProofMime,
  isTrustedPaymentProofPath,
  paymentProofFilename,
  validatePaymentProofBytes,
} from "@/shared/storage/payment-proof-storage";
import {
  detectAbaQrMime,
  validateAbaQrBytes,
} from "@/shared/storage/aba-qr-storage";
import { AppError } from "@/shared/errors/app-error";

const pngHeader = Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0, 0, 0]);
const jpegHeader = Uint8Array.from([0xff, 0xd8, 0xff, 0xe0, 0, 0, 0, 0, 0, 0, 0, 0]);

describe("payment proof rules", () => {
  it("sets COD to not required and ABA to awaiting proof", () => {
    expect(initialPaymentProofStatus("cod")).toBe("not_required");
    expect(initialPaymentProofStatus("aba_transfer")).toBe("awaiting_proof");
  });

  it("allows upload only while awaiting or rejected", () => {
    expect(
      customerCanUploadPaymentProof({
        paymentMethod: "aba_transfer",
        paymentProofStatus: "awaiting_proof",
      }),
    ).toBe(true);
    expect(
      customerCanUploadPaymentProof({
        paymentMethod: "aba_transfer",
        paymentProofStatus: "rejected",
      }),
    ).toBe(true);
    expect(
      customerCanUploadPaymentProof({
        paymentMethod: "aba_transfer",
        paymentProofStatus: "submitted",
      }),
    ).toBe(false);
    expect(
      customerCanUploadPaymentProof({
        paymentMethod: "cod",
        paymentProofStatus: "awaiting_proof",
      }),
    ).toBe(false);
  });

  it("keeps admin labels short", () => {
    expect(paymentProofStatusLabel("submitted")).toBe("Submitted");
    expect(paymentProofStatusLabel("verified")).toBe("Verified");
  });

  it("uses clear customer-facing confirmation copy", () => {
    expect(customerPaymentConfirmationCopy("awaiting_proof").title).toBe(
      "Payment Confirmation Needed",
    );
    expect(customerPaymentConfirmationCopy("submitted").title).toBe(
      "Payment Confirmation Submitted",
    );
    expect(customerPaymentConfirmationCopy("verified").title).toBe("Payment Verified");
    expect(customerPaymentConfirmationCopy("rejected").title).toBe(
      "Payment Confirmation Needs Attention",
    );
    expect(customerPaymentConfirmationUploadLabel("awaiting_proof")).toBe(
      "Upload Payment Confirmation",
    );
    expect(customerPaymentConfirmationUploadLabel("rejected")).toBe(
      "Upload New Payment Confirmation",
    );
  });

  it("maps upload errors to customer-friendly messages", () => {
    expect(mapCustomerPaymentUploadError("Image must be 5 MB or smaller")).toBe(
      "This file is too large. Please choose a smaller file.",
    );
    expect(mapCustomerPaymentUploadError("Upload a PNG, JPG, or WEBP screenshot")).toBe(
      "Please upload a supported image file.",
    );
    expect(mapCustomerPaymentUploadError("Choose a transfer screenshot to upload")).toBe(
      "Please choose a payment confirmation file to upload.",
    );
    expect(mapCustomerPaymentUploadError("storage bucket failed")).toBe(
      "We couldn't upload your payment confirmation. Please try again.",
    );
  });

  it("documents the actual accepted file requirements", () => {
    expect(PAYMENT_PROOF_REQUIREMENTS_LABEL).toContain("JPG");
    expect(PAYMENT_PROOF_REQUIREMENTS_LABEL).toContain("PNG");
    expect(PAYMENT_PROOF_REQUIREMENTS_LABEL).toContain("WEBP");
    expect(PAYMENT_PROOF_REQUIREMENTS_LABEL).toContain("5 MB");
    expect(PAYMENT_PROOF_REQUIREMENTS_LABEL.toLowerCase()).not.toContain("pdf");
  });
});

describe("payment proof path helpers", () => {
  it("accepts only tenant-scoped paths", () => {
    expect(isTrustedPaymentProofPath("tenant-a", "order-1", "tenant-a/order-1/proof.png")).toBe(
      true,
    );
    expect(isTrustedPaymentProofPath("tenant-a", "order-1", "tenant-b/order-1/proof.png")).toBe(
      false,
    );
    expect(isTrustedPaymentProofPath("tenant-a", "order-1", "tenant-a/order-1/../secret.png")).toBe(
      false,
    );
  });

  it("builds a safe inline filename", () => {
    expect(paymentProofFilename("ORD 100/A", "tenant/order/file.webp")).toBe(
      "payment-proof-ORD-100-A.webp",
    );
  });
});

describe("payment proof file validation", () => {
  it("accepts PNG and JPEG headers", () => {
    expect(detectPaymentProofMime(pngHeader)).toBe("image/png");
    expect(detectPaymentProofMime(jpegHeader)).toBe("image/jpeg");
    expect(validatePaymentProofBytes(pngHeader)).toEqual({ mime: "image/png", ext: "png" });
  });

  it("rejects empty and unknown bytes", () => {
    expect(() => validatePaymentProofBytes(new Uint8Array())).toThrow(AppError);
    expect(() => validatePaymentProofBytes(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]))).toThrow(
      AppError,
    );
  });
});

describe("ABA QR file validation", () => {
  it("accepts the supported image formats", () => {
    expect(detectAbaQrMime(pngHeader)).toBe("image/png");
    expect(detectAbaQrMime(jpegHeader)).toBe("image/jpeg");
    expect(validateAbaQrBytes(pngHeader)).toEqual({ mime: "image/png", ext: "png" });
  });

  it("rejects unsupported QR image bytes", () => {
    expect(() => validateAbaQrBytes(new Uint8Array())).toThrow(AppError);
    expect(() =>
      validateAbaQrBytes(Uint8Array.from([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])),
    ).toThrow(AppError);
  });
});
