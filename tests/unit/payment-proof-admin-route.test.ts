import { describe, expect, it, vi, beforeEach } from "vitest";

const { getAdminSession, getAdminPaymentProofFile } = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  getAdminPaymentProofFile: vi.fn(),
}));

vi.mock("@/shared/auth/admin-session", () => ({
  getAdminSession: getAdminSession,
  requireAdminSession: async () => {
    const session = await getAdminSession();
    if (!session) {
      const { redirect } = await import("next/navigation");
      redirect("/admin/login");
    }
    return session;
  },
}));

vi.mock("@/modules/orders/services/payment-proof-service", () => ({
  getAdminPaymentProofFile,
}));

import { GET } from "@/app/(admin)/admin/orders/[orderId]/payment-proof/route";

describe("admin payment proof route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("redirects unauthenticated requests via requireAdminSession", async () => {
    getAdminSession.mockResolvedValue(null);

    await expect(
      GET(new Request("http://localhost/admin/orders/order-1/payment-proof"), {
        params: Promise.resolve({ orderId: "order-1" }),
      }),
    ).rejects.toThrow("NEXT_REDIRECT");
    expect(getAdminPaymentProofFile).not.toHaveBeenCalled();
  });

  it("returns the proof with private cache and inline disposition headers", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    getAdminPaymentProofFile.mockResolvedValue({
      bytes: new Uint8Array([0x89, 0x50, 0x4e, 0x47]),
      contentType: "image/png",
      filename: "payment-proof-ORD-1.png",
    });

    const response = await GET(
      new Request("http://localhost/admin/orders/order-1/payment-proof"),
      { params: Promise.resolve({ orderId: "order-1" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("Content-Type")).toBe("image/png");
    expect(response.headers.get("Content-Disposition")).toBe(
      'inline; filename="payment-proof-ORD-1.png"',
    );
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
    expect(getAdminPaymentProofFile).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      orderId: "order-1",
    });
  });

  it("returns 404 when the proof is missing", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    const { AppError } = await import("@/shared/errors/app-error");
    getAdminPaymentProofFile.mockRejectedValue(
      new AppError("NOT_FOUND", "Payment proof not found"),
    );

    const response = await GET(
      new Request("http://localhost/admin/orders/order-1/payment-proof"),
      { params: Promise.resolve({ orderId: "order-1" }) },
    );

    expect(response.status).toBe(404);
    expect(await response.text()).toBe("Payment proof not found");
    expect(response.headers.get("Cache-Control")).toBe("private, no-store");
  });

  it("returns 403 for cross-tenant or invalid proof access", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    const { AppError } = await import("@/shared/errors/app-error");
    getAdminPaymentProofFile.mockRejectedValue(
      new AppError("FORBIDDEN", "Invalid payment proof path"),
    );

    const response = await GET(
      new Request("http://localhost/admin/orders/other-tenant-order/payment-proof"),
      { params: Promise.resolve({ orderId: "other-tenant-order" }) },
    );

    expect(response.status).toBe(403);
    expect(await response.text()).toBe("Invalid payment proof path");
  });

  it("returns a controlled 500 on storage failures", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    const { AppError } = await import("@/shared/errors/app-error");
    getAdminPaymentProofFile.mockRejectedValue(
      new AppError("INTERNAL", "Could not retrieve the transfer screenshot"),
    );

    const response = await GET(
      new Request("http://localhost/admin/orders/order-1/payment-proof"),
      { params: Promise.resolve({ orderId: "order-1" }) },
    );

    expect(response.status).toBe(500);
    expect(await response.text()).toBe("Could not retrieve the transfer screenshot");
  });
});
