import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, notifyPaymentProofReviewedAfterCommit } = vi.hoisted(() => ({
  prismaMock: {
    order: {
      updateMany: vi.fn(),
    },
  },
  notifyPaymentProofReviewedAfterCommit: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/modules/notifications/services/notification-service", () => ({
  notifyPaymentProofReviewedAfterCommit,
}));

import {
  rejectOrderPaymentProof,
  verifyOrderPaymentProof,
} from "@/modules/orders/services/payment-proof-service";

describe("payment proof verify/reject notification wiring", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    notifyPaymentProofReviewedAfterCommit.mockResolvedValue(undefined);
  });

  it("notifies only after a successful Verify mutation", async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });

    await verifyOrderPaymentProof({ tenantId: "tenant-a", orderId: "order-a" });

    expect(prismaMock.order.updateMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "order-a",
          tenantId: "tenant-a",
          paymentProofStatus: "submitted",
        }),
        data: expect.objectContaining({ paymentProofStatus: "verified" }),
      }),
    );
    expect(notifyPaymentProofReviewedAfterCommit).toHaveBeenCalledTimes(1);
    expect(notifyPaymentProofReviewedAfterCommit).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      orderId: "order-a",
      outcome: "verified",
    });
  });

  it("does not notify when Verify fails the state transition", async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      verifyOrderPaymentProof({ tenantId: "tenant-a", orderId: "order-a" }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(notifyPaymentProofReviewedAfterCommit).not.toHaveBeenCalled();
  });

  it("notifies only after a successful Reject mutation", async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });

    await rejectOrderPaymentProof({
      tenantId: "tenant-a",
      orderId: "order-a",
      reason: "Blurry screenshot",
    });

    expect(notifyPaymentProofReviewedAfterCommit).toHaveBeenCalledTimes(1);
    expect(notifyPaymentProofReviewedAfterCommit).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      orderId: "order-a",
      outcome: "rejected",
      rejectionReason: "Blurry screenshot",
    });
  });

  it("does not notify when Reject fails the state transition", async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 0 });

    await expect(
      rejectOrderPaymentProof({
        tenantId: "tenant-a",
        orderId: "order-a",
        reason: "Nope",
      }),
    ).rejects.toMatchObject({ code: "VALIDATION" });

    expect(notifyPaymentProofReviewedAfterCommit).not.toHaveBeenCalled();
  });

  it("keeps Verify successful when Telegram notify throws", async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    notifyPaymentProofReviewedAfterCommit.mockRejectedValue(new Error("boom"));

    await expect(
      verifyOrderPaymentProof({ tenantId: "tenant-a", orderId: "order-a" }),
    ).resolves.toBeUndefined();

    expect(prismaMock.order.updateMany).toHaveBeenCalled();
    expect(notifyPaymentProofReviewedAfterCommit).toHaveBeenCalledTimes(1);
  });

  it("keeps Reject successful when Telegram notify throws", async () => {
    prismaMock.order.updateMany.mockResolvedValue({ count: 1 });
    notifyPaymentProofReviewedAfterCommit.mockRejectedValue(new Error("boom"));

    await expect(
      rejectOrderPaymentProof({
        tenantId: "tenant-a",
        orderId: "order-a",
        reason: "Unreadable",
      }),
    ).resolves.toBeUndefined();

    expect(notifyPaymentProofReviewedAfterCommit).toHaveBeenCalledTimes(1);
  });
});
