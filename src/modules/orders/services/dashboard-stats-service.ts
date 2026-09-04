import { prisma } from "@/shared/db/prisma";

import { resolveOrderCustomerType } from "../customer-type";
import {
  dashboardRangeStart,
  type DashboardRangeDays,
} from "../dashboard-range";
import { findFirstOrdersByCustomerIds } from "../repositories/order-repository";
import type { AdminOrderListItem } from "../types";

export type DashboardPeriodStats = {
  rangeDays: DashboardRangeDays;
  from: Date;
  ordersInPeriod: number;
  newCustomersInPeriod: number;
  returningCustomersInPeriod: number;
};

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
