import { describe, expect, it } from "vitest";

import {
  customerCanUploadPaymentProof,
  initialPaymentProofStatus,
  paymentProofStatusLabel,
} from "@/modules/orders/payment-proof";
import {
  detectPaymentProofMime,
  validatePaymentProofBytes,
} from "@/shared/storage/payment-proof-storage";
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

  it("labels statuses for customers", () => {
    expect(paymentProofStatusLabel("submitted")).toBe("Submitted");
    expect(paymentProofStatusLabel("verified")).toBe("Verified");
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
