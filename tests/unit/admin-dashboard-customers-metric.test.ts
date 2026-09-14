import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
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

import { DashboardLiveSections } from "@/modules/orders/components/admin/dashboard-live-sections";
import {
  dashboardWindowFromPreset,
  parseCustomDashboardRange,
} from "@/modules/orders/dashboard-range";
import {
  ACTIVE_ORDER_STATUSES,
  getAdminDashboardLiveSnapshot,
  getDashboardPeriodStats,
} from "@/modules/orders/services/dashboard-stats-service";

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

  it("keeps customersAllTime all-time (not filtered by range)", async () => {
    prismaMock.customer.count.mockResolvedValue(9);

    const snapshot = await getAdminDashboardLiveSnapshot("tenant-a", 28);

    expect(snapshot.customersAllTime).toBe(9);
    const arg = prismaMock.customer.count.mock.calls[0][0];
    expect(arg.where).toEqual({ tenantId: "tenant-a" });
  });
});

describe("dashboard period metrics", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.order.count.mockResolvedValue(0);
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.customer.count.mockResolvedValue(0);
    findFirstOrdersByCustomerIds.mockResolvedValue(new Map());
  });

  it("counts total orders in a preset window for the tenant", async () => {
    prismaMock.order.count.mockResolvedValueOnce(4); // period
    prismaMock.order.findMany.mockResolvedValueOnce([]);

    const stats = await getDashboardPeriodStats(
      "tenant-a",
      dashboardWindowFromPreset(7, new Date("2026-09-14T12:00:00.000Z")),
    );

    expect(stats.ordersInPeriod).toBe(4);
    expect(prismaMock.order.count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-a",
        placedAt: { gte: expect.any(Date) },
      },
    });
  });

  it("applies inclusive custom from/to on order queries", async () => {
    const window = parseCustomDashboardRange("2026-09-01", "2026-09-10")!;
    prismaMock.order.count.mockResolvedValueOnce(2);
    prismaMock.order.findMany.mockResolvedValueOnce([]);

    await getDashboardPeriodStats("tenant-a", window);

    expect(prismaMock.order.count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-a",
        placedAt: { gte: window.from, lte: window.to },
      },
    });
  });

  it("classifies new vs returning customers from first-order history", async () => {
    const from = new Date("2026-09-01T00:00:00.000Z");
    prismaMock.order.count.mockResolvedValueOnce(3);
    prismaMock.order.findMany.mockResolvedValueOnce([
      { customerId: "new-1" },
      { customerId: "ret-1" },
    ]);
    findFirstOrdersByCustomerIds.mockResolvedValue(
      new Map([
        ["new-1", { id: "o1", placedAt: new Date("2026-09-05T00:00:00.000Z") }],
        ["ret-1", { id: "o0", placedAt: new Date("2026-08-01T00:00:00.000Z") }],
      ]),
    );

    const stats = await getDashboardPeriodStats(
      "tenant-a",
      parseCustomDashboardRange("2026-09-01", "2026-09-30")!,
    );

    expect(stats.newCustomersInPeriod).toBe(1);
    expect(stats.returningCustomersInPeriod).toBe(1);
    expect(from.getTime()).toBeLessThan(
      new Date("2026-09-05T00:00:00.000Z").getTime(),
    );
  });

  it("counts active orders with the open pipeline statuses only", async () => {
    prismaMock.order.count
      .mockResolvedValueOnce(0) // period
      .mockResolvedValueOnce(0) // all-time
      .mockResolvedValueOnce(5); // active
    prismaMock.order.findMany.mockResolvedValue([]);
    prismaMock.customer.count.mockResolvedValue(0);

    const snapshot = await getAdminDashboardLiveSnapshot("tenant-a", 7);

    expect(snapshot.activeOrders).toBe(5);
    expect(ACTIVE_ORDER_STATUSES).toEqual([
      "pending",
      "confirmed",
      "processing",
      "ready_for_pickup",
      "out_for_delivery",
    ]);
    expect(prismaMock.order.count).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-a",
        status: { in: [...ACTIVE_ORDER_STATUSES] },
      },
    });
  });
});

describe("dashboard metric cards UI", () => {
  it("renders only the five requested overview cards", () => {
    const window = dashboardWindowFromPreset(7);
    const html = renderToStaticMarkup(
      createElement(DashboardLiveSections, {
        window,
        initial: {
          kind: "preset",
          rangeDays: 7,
          rangeLabel: "Past 7 Days",
          fromParam: null,
          toParam: null,
          ordersInPeriod: 1,
          ordersAllTime: 2,
          customersAllTime: 3,
          newCustomersInPeriod: 4,
          returningCustomersInPeriod: 5,
          activeOrders: 6,
          recent: [],
          generatedAt: "2026-09-14T12:00:00.000Z",
        },
      }),
    );

    expect(html).toContain("Total Orders");
    expect(html).toContain("Total Customers");
    expect(html).toContain("New Customers");
    expect(html).toContain("Returning Customers");
    expect(html).toContain("Active Orders");
    expect(html).not.toContain(">Products<");
    expect(html).not.toContain("Unavailable");
    expect(html).not.toContain(">Currency<");
  });
});
