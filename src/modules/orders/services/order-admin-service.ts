import { findTelegramIdentityForCustomer } from "@/modules/customers/repositories/customer-repository";
import { findUsersByIds } from "@/modules/identity/repositories/user-repository";
import { listOrderNotifications } from "@/modules/notifications/services/notification-service";
import { AppError } from "@/shared/errors/app-error";
import { normalizePhone } from "@/shared/phone/normalize-phone";

import {
  findOrderDetailForAdmin,
  listOrdersForAdmin,
} from "../repositories/order-repository";
import type { OrderAdminListQueryInput } from "../schemas/order-admin";
import type {
  AdminOrderDetail,
  AdminOrderListItem,
  AdminOrderListResult,
  OrderStatusHistoryEntry,
} from "../types";
import { getAllowedNextStatuses } from "./order-status-service";

function startOfUtcDay(dateStr: string): Date | undefined {
  if (!dateStr) {
    return undefined;
  }
  const d = new Date(`${dateStr}T00:00:00.000Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

function endOfUtcDay(dateStr: string): Date | undefined {
  if (!dateStr) {
    return undefined;
  }
  const d = new Date(`${dateStr}T23:59:59.999Z`);
  return Number.isNaN(d.getTime()) ? undefined : d;
}

export async function listOrdersForAdminTenant(
  tenantId: string,
  query: OrderAdminListQueryInput,
): Promise<AdminOrderListResult> {
  const page = query.page;
  const pageSize = query.pageSize;
  const skip = (page - 1) * pageSize;

  const q = query.q?.trim() || undefined;
  const search = q
    ? // Prefer digits-only when the query looks like a phone, but keep raw for name/number.
      q
    : undefined;

  const { rows, total } = await listOrdersForAdmin({
    tenantId,
    q: search,
    status: query.status || undefined,
    paymentMethod: query.paymentMethod || undefined,
    fulfillmentMethod: query.fulfillmentMethod || undefined,
    placedFrom: startOfUtcDay(query.from ?? ""),
    placedTo: endOfUtcDay(query.to ?? ""),
    skip,
    take: pageSize,
  });

  const items: AdminOrderListItem[] = rows.map((row) => ({
    id: row.id,
    orderNumber: row.orderNumber,
    status: row.status,
    paymentMethod: row.paymentMethod,
    fulfillmentMethod: row.fulfillmentMethod,
    totalMinor: row.totalMinor,
    currency: row.currency,
    placedAt: row.placedAt,
    customer: {
      displayName: row.customer.displayName,
      phone: row.customer.phone,
    },
  }));

  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getOrderDetailForAdmin(
  tenantId: string,
  orderId: string,
): Promise<AdminOrderDetail> {
  const order = await findOrderDetailForAdmin(tenantId, orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found");
  }

  const actorIds = [
    ...new Set(
      order.statusHistory
        .map((entry) => entry.createdBy)
        .filter((id): id is string => Boolean(id)),
    ),
  ];
  const users = await findUsersByIds(actorIds);
  const userById = new Map(users.map((user) => [user.id, user]));

  const statusHistory: OrderStatusHistoryEntry[] = order.statusHistory.map((entry) => {
    const actor = entry.createdBy ? userById.get(entry.createdBy) : undefined;
    return {
      id: entry.id,
      fromStatus: entry.fromStatus,
      toStatus: entry.toStatus,
      note: entry.note,
      createdAt: entry.createdAt,
      createdBy: entry.createdBy,
      actorLabel: actor
        ? (actor.displayName ?? actor.email)
        : entry.createdBy
          ? "Admin"
          : "System",
    };
  });

  const [telegramIdentity, notifications] = await Promise.all([
    findTelegramIdentityForCustomer({
      tenantId,
      customerId: order.customer.id,
    }),
    listOrderNotifications(tenantId, orderId),
  ]);

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    channel: order.channel,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    deliveryFeeMinor: order.deliveryFeeMinor,
    discountMinor: order.discountMinor,
    totalMinor: order.totalMinor,
    notes: order.notes,
    fulfillmentMethod: order.fulfillmentMethod,
    addressLine: order.addressLine,
    cityOrArea: order.cityOrArea,
    deliveryInstructions: order.deliveryInstructions,
    pickupLocationKey: order.pickupLocationKey,
    pickupLocationName: order.pickupLocationName,
    pickupLocationAddress: order.pickupLocationAddress,
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
    paymentProofStatus: order.paymentProofStatus,
    paymentProofRejectionReason: order.paymentProofRejectionReason,
    placedAt: order.placedAt,
    customer: {
      id: order.customer.id,
      displayName: order.customer.displayName,
      phone: order.customer.phone,
      email: order.customer.email,
    },
    items: order.items.map((item) => ({
      id: item.id,
      productId: item.productId,
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.lineTotalMinor,
      volume: item.volumeSnapshot,
      sellingUnit: item.sellingUnitSnapshot ?? "item",
    })),
    statusHistory,
    allowedNextStatuses: getAllowedNextStatuses(order.status, order.fulfillmentMethod),
    telegramLinked: Boolean(telegramIdentity),
    notifications: notifications.map((row) => ({
      id: row.id,
      toStatus: row.toStatus,
      status: row.status,
      errorCode: row.errorCode,
    })),
  };
}

/** Exported for tests / tooling — phone search uses digits when present. */
export function normalizeAdminPhoneQuery(q: string): string {
  return normalizePhone(q);
}
