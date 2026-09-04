import { Prisma } from "@prisma/client";

import { composeDisplayName } from "@/modules/customers";
import {
  customerLifecycleLabel,
  resolveOrderCustomerType,
  type CustomerLifecycleLabel,
  type OrderCustomerType,
} from "@/modules/orders/customer-type";
import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";
import { formatPhoneForDisplay, normalizePhoneToE164, stripPhoneDigits } from "@/shared/phone/normalize-phone";

/** Cancelled orders are excluded from lifetime value (still count toward order history). */
const LTV_EXCLUDED_STATUSES = ["cancelled"] as const;

export type AdminCustomerListItem = {
  id: string;
  displayName: string | null;
  phone: string | null;
  phoneDisplay: string;
  email: string | null;
  totalOrders: number;
  lifetimeValueMinor: number;
  currency: string;
  lifecycle: CustomerLifecycleLabel;
  lastOrderAt: Date | null;
  lastOrderNumber: string | null;
  telegramLinked: boolean;
};

export type AdminCustomerListResult = {
  items: AdminCustomerListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
};

export type AdminCustomerOrderHistoryItem = {
  id: string;
  orderNumber: string;
  status: string;
  paymentMethod: string;
  paymentProofStatus: string;
  fulfillmentMethod: string;
  totalMinor: number;
  currency: string;
  placedAt: Date;
  customerType: OrderCustomerType;
};

export type AdminCustomerProfile = {
  id: string;
  displayName: string | null;
  phone: string | null;
  phoneDisplay: string;
  email: string | null;
  customerSince: Date;
  telegramLinked: boolean;
  totalOrders: number;
  lifetimeValueMinor: number;
  currency: string;
  lifecycle: CustomerLifecycleLabel;
  lastOrderAt: Date | null;
  lastOrderId: string | null;
  lastOrderNumber: string | null;
  lastOrderStatus: string | null;
  orders: AdminCustomerOrderHistoryItem[];
  orderPage: number;
  orderPageSize: number;
  orderTotalPages: number;
};

export async function listCustomersForAdminTenant(
  tenantId: string,
  input: { page: number; pageSize: number; q?: string },
): Promise<AdminCustomerListResult> {
  const page = Math.max(1, input.page);
  const pageSize = Math.min(50, Math.max(1, input.pageSize));
  const skip = (page - 1) * pageSize;
  const q = input.q?.trim();

  const where: Prisma.CustomerWhereInput = {
    tenantId,
    deletedAt: null,
  };

  if (q) {
    const digits = stripPhoneDigits(q);
    const e164 = normalizePhoneToE164(q);
    where.OR = [
      { displayName: { contains: q, mode: "insensitive" } },
      { firstName: { contains: q, mode: "insensitive" } },
      { lastName: { contains: q, mode: "insensitive" } },
      { email: { contains: q, mode: "insensitive" } },
      ...(digits
        ? [
            { phone: { contains: digits } },
            { phoneNormalized: { contains: digits } },
            ...(e164 ? [{ phoneNormalized: e164 }] : []),
          ]
        : []),
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.customer.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        displayName: true,
        firstName: true,
        lastName: true,
        phone: true,
        email: true,
        identities: {
          where: { channel: "telegram" },
          select: { id: true },
          take: 1,
        },
      },
    }),
    prisma.customer.count({ where }),
  ]);

  const customerIds = rows.map((row) => row.id);
  const stats = await loadCustomerOrderStats(tenantId, customerIds);

  const items: AdminCustomerListItem[] = rows.map((row) => {
    const s = stats.get(row.id);
    const totalOrders = s?.totalOrders ?? 0;
    return {
      id: row.id,
      displayName: composeDisplayName(row),
      phone: row.phone,
      phoneDisplay: row.phone ? formatPhoneForDisplay(row.phone) : "",
      email: row.email,
      totalOrders,
      lifetimeValueMinor: s?.lifetimeValueMinor ?? 0,
      currency: s?.currency ?? "USD",
      lifecycle: customerLifecycleLabel(totalOrders),
      lastOrderAt: s?.lastOrderAt ?? null,
      lastOrderNumber: s?.lastOrderNumber ?? null,
      telegramLinked: row.identities.length > 0,
    };
  });

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getCustomerProfileForAdmin(
  tenantId: string,
  customerId: string,
  input: { orderPage?: number; orderPageSize?: number } = {},
): Promise<AdminCustomerProfile> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    select: {
      id: true,
      displayName: true,
      firstName: true,
      lastName: true,
      phone: true,
      email: true,
      createdAt: true,
      identities: {
        where: { channel: "telegram" },
        select: { id: true },
        take: 1,
      },
    },
  });

  if (!customer) {
    throw new AppError("NOT_FOUND", "Customer not found");
  }

  const orderPage = Math.max(1, input.orderPage ?? 1);
  const orderPageSize = Math.min(50, Math.max(1, input.orderPageSize ?? 20));
  const skip = (orderPage - 1) * orderPageSize;

  const [orderTotal, orderRows, aggregates, firstOrder, latestOrder] = await Promise.all([
    prisma.order.count({ where: { tenantId, customerId } }),
    prisma.order.findMany({
      where: { tenantId, customerId },
      orderBy: [{ placedAt: "desc" }, { id: "desc" }],
      skip,
      take: orderPageSize,
      select: {
        id: true,
        orderNumber: true,
        status: true,
        paymentMethod: true,
        paymentProofStatus: true,
        fulfillmentMethod: true,
        totalMinor: true,
        currency: true,
        placedAt: true,
      },
    }),
    prisma.order.aggregate({
      where: {
        tenantId,
        customerId,
        status: { notIn: [...LTV_EXCLUDED_STATUSES] },
      },
      _sum: { totalMinor: true },
    }),
    prisma.order.findFirst({
      where: { tenantId, customerId },
      orderBy: [{ placedAt: "asc" }, { id: "asc" }],
      select: { id: true, placedAt: true, currency: true },
    }),
    prisma.order.findFirst({
      where: { tenantId, customerId },
      orderBy: [{ placedAt: "desc" }, { id: "desc" }],
      select: {
        id: true,
        orderNumber: true,
        status: true,
        placedAt: true,
        currency: true,
      },
    }),
  ]);

  const currency = firstOrder?.currency ?? latestOrder?.currency ?? "USD";

  const orders: AdminCustomerOrderHistoryItem[] = orderRows.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    paymentMethod: row.paymentMethod,
    paymentProofStatus: row.paymentProofStatus,
    fulfillmentMethod: row.fulfillmentMethod,
    totalMinor: row.totalMinor,
    currency: row.currency,
    placedAt: row.placedAt,
    customerType: resolveOrderCustomerType(
      { id: row.id, placedAt: row.placedAt },
      firstOrder,
    ),
  }));

  return {
    id: customer.id,
    displayName: composeDisplayName(customer),
    phone: customer.phone,
    phoneDisplay: customer.phone ? formatPhoneForDisplay(customer.phone) : "",
    email: customer.email,
    customerSince: firstOrder?.placedAt ?? customer.createdAt,
    telegramLinked: customer.identities.length > 0,
    totalOrders: orderTotal,
    lifetimeValueMinor: aggregates._sum.totalMinor ?? 0,
    currency,
    lifecycle: customerLifecycleLabel(orderTotal),
    lastOrderAt: latestOrder?.placedAt ?? null,
    lastOrderId: latestOrder?.id ?? null,
    lastOrderNumber: latestOrder?.orderNumber ?? null,
    lastOrderStatus: latestOrder?.status ?? null,
    orders,
    orderPage,
    orderPageSize,
    orderTotalPages: Math.max(1, Math.ceil(orderTotal / orderPageSize)),
  };
}

type CustomerOrderStats = {
  totalOrders: number;
  lifetimeValueMinor: number;
  currency: string;
  lastOrderAt: Date | null;
  lastOrderNumber: string | null;
};

async function loadCustomerOrderStats(
  tenantId: string,
  customerIds: string[],
): Promise<Map<string, CustomerOrderStats>> {
  const result = new Map<string, CustomerOrderStats>();
  if (customerIds.length === 0) {
    return result;
  }

  const [counts, ltv, lastOrders] = await Promise.all([
    prisma.order.groupBy({
      by: ["customerId"],
      where: { tenantId, customerId: { in: customerIds } },
      _count: { _all: true },
    }),
    prisma.order.groupBy({
      by: ["customerId"],
      where: {
        tenantId,
        customerId: { in: customerIds },
        status: { notIn: [...LTV_EXCLUDED_STATUSES] },
      },
      _sum: { totalMinor: true },
    }),
    prisma.$queryRaw<
      Array<{
        customer_id: string;
        order_number: string;
        placed_at: Date;
        currency: string;
      }>
    >(Prisma.sql`
      SELECT DISTINCT ON (customer_id)
        customer_id,
        order_number,
        placed_at,
        currency
      FROM orders
      WHERE tenant_id = ${tenantId}
        AND customer_id IN (${Prisma.join(customerIds)})
      ORDER BY customer_id ASC, placed_at DESC, id DESC
    `),
  ]);

  for (const id of customerIds) {
    result.set(id, {
      totalOrders: 0,
      lifetimeValueMinor: 0,
      currency: "USD",
      lastOrderAt: null,
      lastOrderNumber: null,
    });
  }

  for (const row of counts) {
    const current = result.get(row.customerId);
    if (current) {
      current.totalOrders = row._count._all;
    }
  }

  for (const row of ltv) {
    const current = result.get(row.customerId);
    if (current) {
      current.lifetimeValueMinor = row._sum.totalMinor ?? 0;
    }
  }

  for (const row of lastOrders) {
    const current = result.get(row.customer_id);
    if (current) {
      current.lastOrderAt = row.placed_at;
      current.lastOrderNumber = row.order_number;
      current.currency = row.currency;
    }
  }

  return result;
}
