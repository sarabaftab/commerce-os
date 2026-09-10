import { beforeEach, describe, expect, it, vi } from "vitest";

const { prismaMock, findFirstOrdersByCustomerIds } = vi.hoisted(() => ({
  prismaMock: {
    order: {
      count: vi.fn(),
      findMany: vi.fn(),
    },
    customer: {
      count: vi.fn(),
    },
  },
  findFirstOrdersByCustomerIds: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/modules/orders/repositories/order-repository", () => ({
  findFirstOrdersByCustomerIds,
}));

import { getAdminDashboardLiveSnapshot } from "@/modules/orders/services/dashboard-stats-service";

describe("getAdminDashboardLiveSnapshot customersAllTime", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.customer.count.mockResolvedValue(0);
    findFirstOrdersByCustomerIds.mockResolvedValue(new Map());
  });

  it("counts Customer rows for the authenticated tenant only", async () => {
    prismaMock.customer.count.mockResolvedValue(12);

    const snapshot = await getAdminDashboardLiveSnapshot("tenant-a", 7);

    expect(prismaMock.customer.count).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a" },
    });
    expect(snapshot.customersAllTime).toBe(12);
  });

  it("returns 0 when the tenant has no customers", async () => {
    prismaMock.customer.count.mockResolvedValue(0);

    const snapshot = await getAdminDashboardLiveSnapshot("tenant-a", 14);

    expect(snapshot.customersAllTime).toBe(0);
    expect(prismaMock.customer.count).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a" },
    });
  });

  it("never counts another tenant when building Tenant A snapshot", async () => {
    prismaMock.customer.count.mockResolvedValue(3);

    await getAdminDashboardLiveSnapshot("tenant-a", 7);

    expect(prismaMock.customer.count).toHaveBeenCalledTimes(1);
    expect(prismaMock.customer.count).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a" },
    });
    expect(prismaMock.customer.count).not.toHaveBeenCalledWith({
      where: { tenantId: "tenant-b" },
    });
  });

  it("keeps customersAllTime all-time (not filtered by 7/14/28 range)", async () => {
    prismaMock.customer.count.mockResolvedValue(9);

    const snapshot = await getAdminDashboardLiveSnapshot("tenant-a", 28);

    expect(snapshot.customersAllTime).toBe(9);
    expect(prismaMock.customer.count).toHaveBeenCalledWith({
      where: { tenantId: "tenant-a" },
    });
    // No placedAt / date filter on the customer count.
    const arg = prismaMock.customer.count.mock.calls[0][0];
    expect(arg.where).toEqual({ tenantId: "tenant-a" });
  });
});
