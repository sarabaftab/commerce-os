import { beforeEach, describe, expect, it, vi } from "vitest";

const { getAdminSession, getAdminDashboardLiveSnapshot } = vi.hoisted(() => ({
  getAdminSession: vi.fn(),
  getAdminDashboardLiveSnapshot: vi.fn(),
}));

vi.mock("@/shared/auth/admin-session", () => ({
  getAdminSession,
}));

vi.mock("@/modules/orders/services/dashboard-stats-service", () => ({
  getAdminDashboardLiveSnapshot,
}));

import { GET } from "@/app/api/admin/dashboard/route";
import {
  buildAdminDashboardPollUrl,
  DASHBOARD_POLL_INTERVAL_MS,
} from "@/modules/orders/dashboard-live";

const sampleSnapshot = {
  rangeDays: 7 as const,
  rangeLabel: "Past 7 Days",
  ordersInPeriod: 2,
  ordersAllTime: 10,
  newCustomersInPeriod: 1,
  returningCustomersInPeriod: 1,
  activeOrders: 3,
  recent: [
    {
      id: "order-a",
      orderNumber: "ORD-A",
      status: "pending" as const,
      paymentMethod: "cod" as const,
      fulfillmentMethod: "delivery" as const,
      totalMinor: 1000,
      currency: "USD",
      placedAt: "2026-09-04T12:00:00.000Z",
      customerType: "new" as const,
      customer: { id: "c1", displayName: "Ada", phone: "+855123" },
    },
  ],
  generatedAt: "2026-09-04T12:00:00.000Z",
};

describe("GET /api/admin/dashboard", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("rejects unauthenticated requests", async () => {
    getAdminSession.mockResolvedValue(null);

    const response = await GET(new Request("http://localhost/api/admin/dashboard"));

    expect(response.status).toBe(401);
    expect(getAdminDashboardLiveSnapshot).not.toHaveBeenCalled();
  });

  it("returns tenant-scoped snapshot for the authenticated admin", async () => {
    getAdminSession.mockResolvedValue({
      tenantId: "tenant-a",
      tenantSlug: "shop-a",
    });
    getAdminDashboardLiveSnapshot.mockResolvedValue(sampleSnapshot);

    const response = await GET(new Request("http://localhost/api/admin/dashboard?range=7"));
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(response.headers.get("Cache-Control")).toContain("no-store");
    expect(response.headers.get("Cache-Control")).toContain("private");
    expect(response.headers.get("Pragma")).toBe("no-cache");
    expect(response.headers.get("X-Dashboard-Generated-At")).toBe(sampleSnapshot.generatedAt);
    expect(body.data).toEqual(sampleSnapshot);
    expect(getAdminDashboardLiveSnapshot).toHaveBeenCalledWith("tenant-a", 7);
  });

  it("preserves the selected 14 and 28 day ranges", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    getAdminDashboardLiveSnapshot.mockResolvedValue(sampleSnapshot);

    await GET(new Request("http://localhost/api/admin/dashboard?range=14"));
    expect(getAdminDashboardLiveSnapshot).toHaveBeenLastCalledWith("tenant-a", 14);

    await GET(new Request("http://localhost/api/admin/dashboard?range=28"));
    expect(getAdminDashboardLiveSnapshot).toHaveBeenLastCalledWith("tenant-a", 28);
  });

  it("defaults invalid ranges to 7 days", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    getAdminDashboardLiveSnapshot.mockResolvedValue(sampleSnapshot);

    await GET(new Request("http://localhost/api/admin/dashboard?range=99"));
    expect(getAdminDashboardLiveSnapshot).toHaveBeenCalledWith("tenant-a", 7);
  });

  it("never accepts a client-supplied tenant id", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    getAdminDashboardLiveSnapshot.mockResolvedValue(sampleSnapshot);

    await GET(
      new Request("http://localhost/api/admin/dashboard?range=7&tenantId=tenant-b"),
    );

    expect(getAdminDashboardLiveSnapshot).toHaveBeenCalledWith("tenant-a", 7);
    expect(getAdminDashboardLiveSnapshot).not.toHaveBeenCalledWith(
      "tenant-b",
      expect.anything(),
    );
  });

  it("ignores cache-bust query params when resolving the snapshot", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    getAdminDashboardLiveSnapshot.mockResolvedValue({
      ...sampleSnapshot,
      ordersInPeriod: 3,
      recent: [
        {
          ...sampleSnapshot.recent[0],
          id: "order-new",
          orderNumber: "ORD-NEW",
        },
        ...sampleSnapshot.recent,
      ],
    });

    const response = await GET(
      new Request("http://localhost/api/admin/dashboard?range=7&_ts=1710000000000"),
    );
    const body = await response.json();

    expect(response.status).toBe(200);
    expect(getAdminDashboardLiveSnapshot).toHaveBeenCalledWith("tenant-a", 7);
    expect(body.data.ordersInPeriod).toBe(3);
    expect(body.data.recent[0].id).toBe("order-new");
  });
});

describe("dashboard poll helpers", () => {
  it("polls every 12 seconds", () => {
    expect(DASHBOARD_POLL_INTERVAL_MS).toBe(12_000);
  });

  it("builds a range-preserving cache-busted poll URL", () => {
    expect(buildAdminDashboardPollUrl(14, 1_700_000_000_000)).toBe(
      "/api/admin/dashboard?range=14&_ts=1700000000000",
    );
    expect(buildAdminDashboardPollUrl(7, 42)).toContain("range=7");
    expect(buildAdminDashboardPollUrl(28, 42)).toContain("range=28");
  });
});

describe("dashboard live snapshot merge behavior", () => {
  it("keeps unique recent orders by id when a newer snapshot arrives", () => {
    const first = sampleSnapshot.recent;
    const next = [
      {
        ...sampleSnapshot.recent[0],
        id: "order-b",
        orderNumber: "ORD-B",
      },
      ...sampleSnapshot.recent,
    ];

    const byId = new Map(next.map((order) => [order.id, order]));
    expect(byId.size).toBe(2);
    expect([...byId.keys()]).toEqual(["order-b", "order-a"]);
    expect(first).toHaveLength(1);
  });
});
