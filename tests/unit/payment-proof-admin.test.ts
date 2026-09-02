import { describe, expect, it, vi, beforeEach } from "vitest";

const { findOrderById, downloadPaymentProofObject } = vi.hoisted(() => ({
  findOrderById: vi.fn(),
  downloadPaymentProofObject: vi.fn(),
}));

vi.mock("@/modules/orders/repositories/order-repository", () => ({
  findOrderById,
}));

vi.mock("@/shared/storage/payment-proof-storage", async (importOriginal) => {
  const actual = await importOriginal<typeof import("@/shared/storage/payment-proof-storage")>();
  return {
    ...actual,
    downloadPaymentProofObject,
  };
});

import { getAdminPaymentProofFile } from "@/modules/orders/services/payment-proof-service";

describe("getAdminPaymentProofFile", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns proof bytes for the admin tenant order", async () => {
    findOrderById.mockResolvedValue({
      id: "order-1",
      tenantId: "tenant-a",
      orderNumber: "ORD-100",
      paymentMethod: "aba_transfer",
      paymentProofPath: "tenant-a/order-1/proof.png",
      paymentProofContentType: "image/png",
    });
    downloadPaymentProofObject.mockResolvedValue({
      bytes: new Uint8Array([1, 2, 3]),
      contentType: "image/png",
    });

    const file = await getAdminPaymentProofFile({
      tenantId: "tenant-a",
      orderId: "order-1",
    });

    expect(file.contentType).toBe("image/png");
    expect(file.filename).toBe("payment-proof-ORD-100.png");
    expect(file.bytes).toEqual(new Uint8Array([1, 2, 3]));
    expect(findOrderById).toHaveBeenCalledWith("tenant-a", "order-1");
    expect(downloadPaymentProofObject).toHaveBeenCalledWith("tenant-a/order-1/proof.png");
  });

  it("returns 404 when the order is outside the tenant", async () => {
    findOrderById.mockResolvedValue(null);

    await expect(
      getAdminPaymentProofFile({ tenantId: "tenant-a", orderId: "order-b" }),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });
    expect(downloadPaymentProofObject).not.toHaveBeenCalled();
  });

  it("returns 404 when no proof path is stored", async () => {
    findOrderById.mockResolvedValue({
      id: "order-1",
      tenantId: "tenant-a",
      orderNumber: "ORD-100",
      paymentMethod: "aba_transfer",
      paymentProofPath: null,
      paymentProofContentType: null,
    });

    await expect(
      getAdminPaymentProofFile({ tenantId: "tenant-a", orderId: "order-1" }),
    ).rejects.toMatchObject({ message: "Payment proof not found", status: 404 });
  });

  it("rejects untrusted storage paths", async () => {
    findOrderById.mockResolvedValue({
      id: "order-1",
      tenantId: "tenant-a",
      orderNumber: "ORD-100",
      paymentMethod: "aba_transfer",
      paymentProofPath: "tenant-b/order-1/proof.png",
      paymentProofContentType: "image/png",
    });

    await expect(
      getAdminPaymentProofFile({ tenantId: "tenant-a", orderId: "order-1" }),
    ).rejects.toMatchObject({ code: "FORBIDDEN", status: 403 });
    expect(downloadPaymentProofObject).not.toHaveBeenCalled();
  });
});
