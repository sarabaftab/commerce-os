import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  orderAggregate,
  orderCount,
  orderFindMany,
  tenantFindFirst,
  feedbackAggregate,
  queryRaw,
  findFirstOrdersByCustomerIds,
} = vi.hoisted(() => ({
  orderAggregate: vi.fn(),
  orderCount: vi.fn(),
  orderFindMany: vi.fn(),
  tenantFindFirst: vi.fn(),
  feedbackAggregate: vi.fn(),
  queryRaw: vi.fn(),
  findFirstOrdersByCustomerIds: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    order: {
      aggregate: orderAggregate,
      count: orderCount,
      findMany: orderFindMany,
    },
    tenant: { findFirst: tenantFindFirst },
    orderFeedback: { aggregate: feedbackAggregate },
    $queryRaw: queryRaw,
  },
}));

vi.mock("@/modules/orders/repositories/order-repository", () => ({
  findFirstOrdersByCustomerIds,
}));

import { insightsWindowFromPreset, parseCustomInsightsRange } from "@/modules/orders/insights-range";
import {
  getAdminInsightsSnapshot,
  INSIGHTS_ABA_UNPAID_PROOF_STATUSES,
  INSIGHTS_SALES_EXCLUDED_STATUSES,
  insightsSalesWhereForTests,
} from "@/modules/orders/services/insights-stats-service";

function stubBaseReads() {
  tenantFindFirst.mockResolvedValue({ currency: "USD" });
  orderAggregate.mockResolvedValue({ _sum: { totalMinor: 0 } });
  orderCount.mockResolvedValue(0);
  orderFindMany.mockResolvedValue([]);
  feedbackAggregate.mockResolvedValue({ _avg: { rating: null }, _count: { _all: 0 } });
  queryRaw.mockResolvedValue([]);
  findFirstOrdersByCustomerIds.mockResolvedValue(new Map());
}

describe("insights sales eligibility", () => {
  it("excludes cancelled and unpaid ABA proofs from sales", () => {
    const where = insightsSalesWhereForTests(
      "tenant-a",
      new Date("2026-11-01T00:00:00.000Z"),
      new Date("2026-11-10T00:00:00.000Z"),
    );
    expect(INSIGHTS_SALES_EXCLUDED_STATUSES).toEqual(["cancelled"]);
    expect(INSIGHTS_ABA_UNPAID_PROOF_STATUSES).toEqual(["awaiting_proof", "rejected"]);
    expect(where).toEqual({
      tenantId: "tenant-a",
      placedAt: {
        gte: new Date("2026-11-01T00:00:00.000Z"),
        lte: new Date("2026-11-10T00:00:00.000Z"),
      },
      status: { notIn: ["cancelled"] },
      NOT: {
        AND: [
          { paymentMethod: "aba_transfer" },
          { paymentProofStatus: { in: ["awaiting_proof", "rejected"] } },
        ],
      },
    });
  });
});

describe("getAdminInsightsSnapshot", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    stubBaseReads();
  });

  it("computes sales, AOV, and empty-safe averages for the tenant window", async () => {
    const window = insightsWindowFromPreset(7, new Date("2026-11-10T12:00:00.000Z"));
    orderAggregate.mockResolvedValue({ _sum: { totalMinor: 10_000 } });
    orderCount.mockImplementation(async (args: { where?: { status?: unknown } }) => {
      // Eligible sales count includes a status filter; total orders does not.
      return args.where?.status ? 4 : 6;
    });
    orderFindMany.mockImplementation(
      async (args: { distinct?: unknown; select?: { customerId?: unknown } }) => {
        if (args.distinct || args.select?.customerId) {
          return [{ customerId: "c1" }, { customerId: "c2" }];
        }
        return [
          { placedAt: new Date("2026-11-08T01:00:00.000Z"), totalMinor: 4_000 },
          { placedAt: new Date("2026-11-09T01:00:00.000Z"), totalMinor: 6_000 },
        ];
      },
    );
    findFirstOrdersByCustomerIds.mockResolvedValue(
      new Map([
        ["c1", { id: "o1", placedAt: new Date("2026-11-08T01:00:00.000Z") }],
        ["c2", { id: "o0", placedAt: new Date("2026-01-01T00:00:00.000Z") }],
      ]),
    );
    queryRaw.mockResolvedValue([
      { source_kind: "telegram_campaign", customer_count: BigInt(1) },
      { source_kind: null, customer_count: BigInt(1) },
    ]);
    feedbackAggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { _all: 2 },
    });

    const snapshot = await getAdminInsightsSnapshot("tenant-a", window);

    expect(snapshot.currency).toBe("USD");
    expect(snapshot.totalSalesMinor).toBe(10_000);
    expect(snapshot.eligibleOrderCount).toBe(4);
    expect(snapshot.totalOrders).toBe(6);
    expect(snapshot.averageOrderValueMinor).toBe(2_500);
    expect(snapshot.newCustomers).toBe(1);
    expect(snapshot.returningCustomers).toBe(1);
    expect(snapshot.feedbackCount).toBe(2);
    expect(snapshot.averageRating).toBe(4.5);
    expect(snapshot.sources.map((row) => `${row.label}:${row.count}`)).toEqual([
      "Telegram:1",
      "Unknown:1",
    ]);
    expect(snapshot.trend.some((point) => point.salesMinor === 4_000)).toBe(true);
    expect(tenantFindFirst).toHaveBeenCalledWith({
      where: { id: "tenant-a" },
      select: { currency: true },
    });
  });

  it("returns null AOV and empty feedback safely when there is no data", async () => {
    const window = insightsWindowFromPreset(30, new Date("2026-11-10T12:00:00.000Z"));
    const snapshot = await getAdminInsightsSnapshot("tenant-a", window);
    expect(snapshot.averageOrderValueMinor).toBeNull();
    expect(snapshot.averageRating).toBeNull();
    expect(snapshot.totalSalesMinor).toBe(0);
    expect(snapshot.totalOrders).toBe(0);
  });

  it("scopes every query to the authenticated tenant", async () => {
    const window = parseCustomInsightsRange("2026-09-01", "2026-09-07")!;
    await getAdminInsightsSnapshot("tenant-a", window);

    expect(orderAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-a" }),
      }),
    );
    expect(feedbackAggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-a" }),
      }),
    );
  });

  it("fills zero-sales Cambodia days in the daily trend", async () => {
    const window = parseCustomInsightsRange("2026-11-01", "2026-11-03")!;
    orderFindMany.mockImplementation(
      async (args: { distinct?: unknown; select?: { customerId?: unknown } }) => {
        if (args.distinct || args.select?.customerId) {
          return [];
        }
        return [
          { placedAt: new Date("2026-11-01T05:00:00.000Z"), totalMinor: 1_000 }, // 12:00 Cambodia
        ];
      },
    );

    const snapshot = await getAdminInsightsSnapshot("tenant-a", window);
    expect(snapshot.trend.map((point) => point.key)).toEqual([
      "2026-11-01",
      "2026-11-02",
      "2026-11-03",
    ]);
    expect(snapshot.trend[0]?.salesMinor).toBe(1_000);
    expect(snapshot.trend[1]?.salesMinor).toBe(0);
    expect(snapshot.trend[2]?.salesMinor).toBe(0);
  });
});
