import { prisma } from "@/shared/db/prisma";

import {
  resolveOrderCustomerType,
  type OrderCustomerType,
} from "../customer-type";
import {
  dashboardRangeLabel,
  dashboardRangeStart,
  type DashboardRangeDays,
} from "../dashboard-range";
import { findFirstOrdersByCustomerIds } from "../repositories/order-repository";
import type { AdminOrderListItem } from "../types";

const ACTIVE_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
] as const;

export type DashboardPeriodStats = {
  rangeDays: DashboardRangeDays;
  from: Date;
  ordersInPeriod: number;
  newCustomersInPeriod: number;
  returningCustomersInPeriod: number;
};

/** JSON-safe snapshot for Admin dashboard auto-refresh. */
export type AdminDashboardLiveOrder = {
  id: string;
  orderNumber: string;
  status: AdminOrderListItem["status"];
  paymentMethod: AdminOrderListItem["paymentMethod"];
  fulfillmentMethod: AdminOrderListItem["fulfillmentMethod"];
  totalMinor: number;
  currency: string;
  placedAt: string;
  customerType: OrderCustomerType;
  customer: {
    id: string;
    displayName: string | null;
    phone: string | null;
  };
};

export type AdminDashboardLiveSnapshot = {
  rangeDays: DashboardRangeDays;
  rangeLabel: string;
  ordersInPeriod: number;
  ordersAllTime: number;
  newCustomersInPeriod: number;
  returningCustomersInPeriod: number;
  activeOrders: number;
  recent: AdminDashboardLiveOrder[];
  generatedAt: string;
};

export async function getAdminDashboardLiveSnapshot(
  tenantId: string,
  rangeDays: DashboardRangeDays,
  now: Date = new Date(),
): Promise<AdminDashboardLiveSnapshot> {
  const periodFrom = dashboardRangeStart(rangeDays, now);

  const [periodStats, recent, ordersAllTime, activeOrders] = await Promise.all([
    getDashboardPeriodStats(tenantId, rangeDays, now),
    listRecentOrdersSince(tenantId, periodFrom, 6),
    prisma.order.count({ where: { tenantId } }),
    prisma.order.count({
      where: {
        tenantId,
        status: { in: [...ACTIVE_ORDER_STATUSES] },
      },
    }),
  ]);

  return {
    rangeDays,
    rangeLabel: dashboardRangeLabel(rangeDays),
    ordersInPeriod: periodStats.ordersInPeriod,
    ordersAllTime,
    newCustomersInPeriod: periodStats.newCustomersInPeriod,
    returningCustomersInPeriod: periodStats.returningCustomersInPeriod,
    activeOrders,
    recent: recent.items.map(serializeDashboardOrder),
    generatedAt: now.toISOString(),
  };
}

function serializeDashboardOrder(order: AdminOrderListItem): AdminDashboardLiveOrder {
  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    paymentMethod: order.paymentMethod,
    fulfillmentMethod: order.fulfillmentMethod,
    totalMinor: order.totalMinor,
    currency: order.currency,
    placedAt: order.placedAt.toISOString(),
    customerType: order.customerType,
    customer: {
      id: order.customer.id,
      displayName: order.customer.displayName,
      phone: order.customer.phone,
    },
  };
}

export async function getDashboardPeriodStats(
  tenantId: string,
  rangeDays: DashboardRangeDays,
  now: Date = new Date(),
): Promise<DashboardPeriodStats> {
  const from = dashboardRangeStart(rangeDays, now);

  const [ordersInPeriod, periodCustomerIds] = await Promise.all([
    prisma.order.count({
      where: { tenantId, placedAt: { gte: from } },
    }),
    prisma.order.findMany({
      where: { tenantId, placedAt: { gte: from } },
      select: { customerId: true },
      distinct: ["customerId"],
    }),
  ]);

  const customerIds = periodCustomerIds.map((row) => row.customerId);
  const firstByCustomer = await findFirstOrdersByCustomerIds(tenantId, customerIds);

  let newCustomersInPeriod = 0;
  let returningCustomersInPeriod = 0;

  for (const customerId of customerIds) {
    const first = firstByCustomer.get(customerId);
    if (!first) {
      continue;
    }
    if (first.placedAt.getTime() >= from.getTime()) {
      newCustomersInPeriod += 1;
    } else {
      returningCustomersInPeriod += 1;
    }
  }

  return {
    rangeDays,
    from,
    ordersInPeriod,
    newCustomersInPeriod,
    returningCustomersInPeriod,
  };
}

export async function listRecentOrdersSince(
  tenantId: string,
  from: Date,
  take = 6,
): Promise<{ items: AdminOrderListItem[] }> {
  const rows = await prisma.order.findMany({
    where: { tenantId, placedAt: { gte: from } },
    include: {
      customer: {
        select: {
          id: true,
          displayName: true,
          phone: true,
          email: true,
        },
      },
    },
    orderBy: { placedAt: "desc" },
    take,
  });

  const firstByCustomer = await findFirstOrdersByCustomerIds(
    tenantId,
    rows.map((row) => row.customer.id),
  );

  return {
    items: rows.map((row) => ({
      id: row.id,
      orderNumber: row.orderNumber,
      status: row.status,
      paymentMethod: row.paymentMethod,
      fulfillmentMethod: row.fulfillmentMethod,
      totalMinor: row.totalMinor,
      currency: row.currency,
      placedAt: row.placedAt,
      customerType: resolveOrderCustomerType(
        { id: row.id, placedAt: row.placedAt },
        firstByCustomer.get(row.customer.id),
      ),
      customer: {
        id: row.customer.id,
        displayName: row.customer.displayName,
        phone: row.customer.phone,
      },
    })),
  };
}
