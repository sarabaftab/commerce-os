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
import { dashboardWindowFromPreset } from "@/modules/orders/dashboard-range";

const sampleSnapshot = {
  kind: "preset" as const,
  rangeDays: 7 as const,
  rangeLabel: "Past 7 Days",
  fromParam: null,
  toParam: null,
  ordersInPeriod: 2,
  ordersAllTime: 10,
  customersAllTime: 5,
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

function expectWindowCall(tenantId: string, matcher: Record<string, unknown>) {
  expect(getAdminDashboardLiveSnapshot).toHaveBeenCalledWith(
    tenantId,
    expect.objectContaining(matcher),
  );
}

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
    expectWindowCall("tenant-a", { kind: "preset", rangeDays: 7 });
  });

  it("preserves the selected 14 and 28 day ranges", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    getAdminDashboardLiveSnapshot.mockResolvedValue(sampleSnapshot);

    await GET(new Request("http://localhost/api/admin/dashboard?range=14"));
    expectWindowCall("tenant-a", { kind: "preset", rangeDays: 14 });

    await GET(new Request("http://localhost/api/admin/dashboard?range=28"));
    expectWindowCall("tenant-a", { kind: "preset", rangeDays: 28 });
  });

  it("defaults invalid ranges to 7 days", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    getAdminDashboardLiveSnapshot.mockResolvedValue(sampleSnapshot);

    await GET(new Request("http://localhost/api/admin/dashboard?range=99"));
    expectWindowCall("tenant-a", { kind: "preset", rangeDays: 7 });
  });

  it("resolves a custom from/to window", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    getAdminDashboardLiveSnapshot.mockResolvedValue({
      ...sampleSnapshot,
      kind: "custom",
      rangeDays: null,
      rangeLabel: "2026-09-01 → 2026-09-10",
      fromParam: "2026-09-01",
      toParam: "2026-09-10",
    });

    await GET(
      new Request("http://localhost/api/admin/dashboard?from=2026-09-01&to=2026-09-10"),
    );

    expectWindowCall("tenant-a", {
      kind: "custom",
      fromParam: "2026-09-01",
      toParam: "2026-09-10",
      rangeDays: null,
    });
  });

  it("never accepts a client-supplied tenant id", async () => {
    getAdminSession.mockResolvedValue({ tenantId: "tenant-a", tenantSlug: "shop-a" });
    getAdminDashboardLiveSnapshot.mockResolvedValue(sampleSnapshot);

    await GET(
      new Request("http://localhost/api/admin/dashboard?range=7&tenantId=tenant-b"),
    );

    expectWindowCall("tenant-a", { kind: "preset", rangeDays: 7 });
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
    expectWindowCall("tenant-a", { kind: "preset", rangeDays: 7 });
    expect(body.data.ordersInPeriod).toBe(3);
    expect(body.data.recent[0].id).toBe("order-new");
  });
});

describe("buildAdminDashboardPollUrl", () => {
  it("includes range and cache-bust for presets", () => {
    const window = dashboardWindowFromPreset(14);
    expect(buildAdminDashboardPollUrl(window, 1_700_000_000_000)).toBe(
      "/api/admin/dashboard?_ts=1700000000000&range=14",
    );
    expect(buildAdminDashboardPollUrl(dashboardWindowFromPreset(7), 42)).toContain(
      "range=7",
    );
    expect(buildAdminDashboardPollUrl(dashboardWindowFromPreset(28), 42)).toContain(
      "range=28",
    );
  });

  it("includes from/to for custom windows", () => {
    const url = buildAdminDashboardPollUrl(
      {
        kind: "custom",
        rangeDays: null,
        fromParam: "2026-09-01",
        toParam: "2026-09-10",
      },
      99,
    );
    expect(url).toContain("from=2026-09-01");
    expect(url).toContain("to=2026-09-10");
    expect(url).not.toContain("range=");
  });

  it("keeps the quiet poll interval", () => {
    expect(DASHBOARD_POLL_INTERVAL_MS).toBe(12_000);
  });
});
