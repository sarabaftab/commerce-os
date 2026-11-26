import { Prisma } from "@prisma/client";

import {
  customerSourceKindLabel,
  type CustomerSourceKind,
} from "@/modules/customers/source";
import { prisma } from "@/shared/db/prisma";
import { CAMBODIA_TIMEZONE, cambodiaDateKey } from "@/shared/time/format-cambodia";

import {
  insightsPlacedAtFilter,
  type InsightsWindow,
} from "../insights-range";
import { findFirstOrdersByCustomerIds } from "../repositories/order-repository";

/**
 * Sales eligibility for Insights Total Sales / AOV / trend.
 *
 * - Exclude cancelled orders.
 * - Exclude ABA transfers that are clearly unpaid (awaiting proof or rejected).
 * - No refund entity exists in Phase 1 schema — none can be excluded.
 * - COD has no separate collection flag; non-cancelled COD totals are included.
 * - ABA `submitted` is included (customer claimed payment; admin may still verify).
 *
 * This is order revenue (totalMinor), not profit.
 */
export const INSIGHTS_SALES_EXCLUDED_STATUSES = ["cancelled"] as const;

export const INSIGHTS_ABA_UNPAID_PROOF_STATUSES = [
  "awaiting_proof",
  "rejected",
] as const;

export type InsightsSourceBreakdown = {
  kind: CustomerSourceKind | null;
  label: string;
  count: number;
};

export type InsightsTrendPoint = {
  /** Bucket start label (YYYY-MM-DD for day, or week start YYYY-MM-DD). */
  key: string;
  label: string;
  salesMinor: number;
};

export type AdminInsightsSnapshot = {
  window: {
    kind: InsightsWindow["kind"];
    rangeDays: InsightsWindow["rangeDays"];
    rangeLabel: string;
    fromParam: string | null;
    toParam: string | null;
    fromIso: string;
    toIso: string;
    trendGrain: InsightsWindow["trendGrain"];
  };
  currency: string;
  /** Sum of eligible order totalMinor in the window. */
  totalSalesMinor: number;
  /** Count of eligible sales orders (same filter as Total Sales). */
  eligibleOrderCount: number;
  /** All placed orders in the window (any status). */
  totalOrders: number;
  /** Eligible sales / eligible orders; null when no eligible orders. */
  averageOrderValueMinor: number | null;
  newCustomers: number;
  returningCustomers: number;
  sources: InsightsSourceBreakdown[];
  feedbackCount: number;
  averageRating: number | null;
  trend: InsightsTrendPoint[];
  salesDefinition:
    "Non-cancelled order totals; ABA awaiting_proof/rejected excluded";
};

function salesEligibleWhere(
  tenantId: string,
  placedAt: { gte: Date; lte: Date },
): Prisma.OrderWhereInput {
  return {
    tenantId,
    placedAt,
    status: { notIn: [...INSIGHTS_SALES_EXCLUDED_STATUSES] },
    NOT: {
      AND: [
        { paymentMethod: "aba_transfer" },
        { paymentProofStatus: { in: [...INSIGHTS_ABA_UNPAID_PROOF_STATUSES] } },
      ],
    },
  };
}

export async function getAdminInsightsSnapshot(
  tenantId: string,
  window: InsightsWindow,
): Promise<AdminInsightsSnapshot> {
  const placedAt = insightsPlacedAtFilter(window);
  const salesWhere = salesEligibleWhere(tenantId, placedAt);

  const [
    tenant,
    salesAgg,
    eligibleOrderCount,
    totalOrders,
    periodCustomerIds,
    sourceRows,
    feedbackAgg,
    trendRows,
  ] = await Promise.all([
    prisma.tenant.findFirst({
      where: { id: tenantId },
      select: { currency: true },
    }),
    prisma.order.aggregate({
      where: salesWhere,
      _sum: { totalMinor: true },
    }),
    prisma.order.count({ where: salesWhere }),
    prisma.order.count({
      where: { tenantId, placedAt },
    }),
    prisma.order.findMany({
      where: {
        tenantId,
        placedAt,
        status: { notIn: [...INSIGHTS_SALES_EXCLUDED_STATUSES] },
      },
      select: { customerId: true },
      distinct: ["customerId"],
    }),
    loadSourcesForPeriodCustomers(tenantId, placedAt),
    prisma.orderFeedback.aggregate({
      where: {
        tenantId,
        createdAt: placedAt,
      },
      _avg: { rating: true },
      _count: { _all: true },
    }),
    loadSalesTrend(window, salesWhere),
  ]);

  const customerIds = periodCustomerIds.map((row) => row.customerId);
  const firstByCustomer = await findFirstOrdersByCustomerIds(tenantId, customerIds);

  let newCustomers = 0;
  let returningCustomers = 0;
  for (const customerId of customerIds) {
    const first = firstByCustomer.get(customerId);
    if (!first) {
      continue;
    }
    // First order of any status (same as admin dashboard classification).
    if (first.placedAt.getTime() >= window.from.getTime()) {
      newCustomers += 1;
    } else {
      returningCustomers += 1;
    }
  }

  const totalSalesMinor = salesAgg._sum.totalMinor ?? 0;

  return {
    window: {
      kind: window.kind,
      rangeDays: window.rangeDays,
      rangeLabel: window.label,
      fromParam: window.fromParam,
      toParam: window.toParam,
      fromIso: window.from.toISOString(),
      toIso: window.to.toISOString(),
      trendGrain: window.trendGrain,
    },
    currency: tenant?.currency ?? "USD",
    totalSalesMinor,
    eligibleOrderCount,
    totalOrders,
    averageOrderValueMinor:
      eligibleOrderCount > 0
        ? Math.round(totalSalesMinor / eligibleOrderCount)
        : null,
    newCustomers,
    returningCustomers,
    sources: sourceRows,
    feedbackCount: feedbackAgg._count._all,
    averageRating:
      feedbackAgg._avg.rating != null
        ? Math.round(feedbackAgg._avg.rating * 10) / 10
        : null,
    trend: trendRows,
    salesDefinition:
      "Non-cancelled order totals; ABA awaiting_proof/rejected excluded",
  };
}

async function loadSourcesForPeriodCustomers(
  tenantId: string,
  placedAt: { gte: Date; lte: Date },
): Promise<InsightsSourceBreakdown[]> {
  // Unique customers with a non-cancelled order in the window, grouped by stored first-touch source.
  const rows = await prisma.$queryRaw<
    Array<{ source_kind: string | null; customer_count: bigint }>
  >(Prisma.sql`
    SELECT c.source_kind, COUNT(*)::bigint AS customer_count
    FROM customers c
    WHERE c.tenant_id = ${tenantId}
      AND c.deleted_at IS NULL
      AND EXISTS (
        SELECT 1
        FROM orders o
        WHERE o.tenant_id = c.tenant_id
          AND o.customer_id = c.id
          AND o.placed_at >= ${placedAt.gte}
          AND o.placed_at <= ${placedAt.lte}
          AND o.status <> 'cancelled'
      )
    GROUP BY c.source_kind
  `);

  return rows
    .map((row) => ({
      kind: (row.source_kind as CustomerSourceKind | null) ?? null,
      label: customerSourceKindLabel(row.source_kind),
      count: Number(row.customer_count),
    }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label));
}

async function loadSalesTrend(
  window: InsightsWindow,
  salesWhere: Prisma.OrderWhereInput,
): Promise<InsightsTrendPoint[]> {
  const orders = await prisma.order.findMany({
    where: salesWhere,
    select: { placedAt: true, totalMinor: true },
    orderBy: { placedAt: "asc" },
  });

  if (window.trendGrain === "day") {
    return buildDailyTrend(window, orders);
  }
  return buildWeeklyTrend(window, orders);
}

function buildDailyTrend(
  window: InsightsWindow,
  orders: Array<{ placedAt: Date; totalMinor: number }>,
): InsightsTrendPoint[] {
  const buckets = new Map<string, number>();
  // Walk Cambodia calendar days from window.from to window.to.
  let cursor = new Date(window.from.getTime());
  const endMs = window.to.getTime();
  while (cursor.getTime() <= endMs) {
    const key = cambodiaDateKey(cursor);
    buckets.set(key, 0);
    cursor = new Date(cursor.getTime() + 24 * 60 * 60 * 1000);
  }

  for (const order of orders) {
    const key = cambodiaDateKey(order.placedAt);
    if (buckets.has(key)) {
      buckets.set(key, (buckets.get(key) ?? 0) + order.totalMinor);
    }
  }

  return [...buckets.entries()].map(([key, salesMinor]) => ({
    key,
    label: key,
    salesMinor,
  }));
}

function buildWeeklyTrend(
  window: InsightsWindow,
  orders: Array<{ placedAt: Date; totalMinor: number }>,
): InsightsTrendPoint[] {
  const buckets = new Map<string, number>();

  for (const order of orders) {
    const key = cambodiaWeekStartKey(order.placedAt);
    buckets.set(key, (buckets.get(key) ?? 0) + order.totalMinor);
  }

  // Ensure empty weeks inside the window appear.
  let cursor = new Date(window.from.getTime());
  const endMs = window.to.getTime();
  while (cursor.getTime() <= endMs) {
    const key = cambodiaWeekStartKey(cursor);
    if (!buckets.has(key)) {
      buckets.set(key, 0);
    }
    cursor = new Date(cursor.getTime() + 7 * 24 * 60 * 60 * 1000);
  }

  return [...buckets.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, salesMinor]) => ({
      key,
      label: `Week of ${key}`,
      salesMinor,
    }));
}

/** Monday (Cambodia local) YYYY-MM-DD for the week containing the instant. */
export function cambodiaWeekStartKey(value: Date): string {
  const key = cambodiaDateKey(value);
  // Interpret the Cambodia calendar date at UTC noon to avoid DST edge issues (none in KH).
  const [y, m, d] = key.split("-").map(Number);
  const utcNoon = new Date(Date.UTC(y, m - 1, d, 12, 0, 0));
  // Weekday in Cambodia: get day-of-week via formatter
  const weekday = new Intl.DateTimeFormat("en-US", {
    timeZone: CAMBODIA_TIMEZONE,
    weekday: "short",
  }).format(value);
  const offsetByName: Record<string, number> = {
    Mon: 0,
    Tue: 1,
    Wed: 2,
    Thu: 3,
    Fri: 4,
    Sat: 5,
    Sun: 6,
  };
  const daysFromMonday = offsetByName[weekday] ?? 0;
  const monday = new Date(utcNoon.getTime() - daysFromMonday * 24 * 60 * 60 * 1000);
  const my = monday.getUTCFullYear();
  const mm = String(monday.getUTCMonth() + 1).padStart(2, "0");
  const md = String(monday.getUTCDate()).padStart(2, "0");
  return `${my}-${mm}-${md}`;
}

/** Exported for unit tests — same filter Insights uses for sales. */
export function insightsSalesWhereForTests(
  tenantId: string,
  from: Date,
  to: Date,
): Prisma.OrderWhereInput {
  return salesEligibleWhere(tenantId, { gte: from, lte: to });
}
