import type { OrderStatus, Prisma } from "@prisma/client";

import { getStorefrontSettings } from "@/modules/settings";
import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import { logCustomerEvent } from "./customer-log";
import {
  customerOrderStatusLabel,
  type CustomerOrderDetailDto,
  type CustomerOrderListFilter,
  type CustomerOrderListResult,
} from "../types";

const ACTIVE_STATUSES: OrderStatus[] = [
  "pending",
  "confirmed",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
];

function statusFilterWhere(filter: CustomerOrderListFilter): Prisma.OrderWhereInput {
  if (filter === "active") {
    return { status: { in: ACTIVE_STATUSES } };
  }
  if (filter === "completed") {
    return { status: "completed" };
  }
  if (filter === "cancelled") {
    return { status: "cancelled" };
  }
  return {};
}

export async function listCustomerOrders(input: {
  tenantId: string;
  customerId: string;
  filter?: CustomerOrderListFilter;
  page?: number;
  pageSize?: number;
}): Promise<CustomerOrderListResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 10));
  const filter = input.filter ?? "all";

  const where: Prisma.OrderWhereInput = {
    tenantId: input.tenantId,
    customerId: input.customerId,
    ...statusFilterWhere(filter),
  };

  const [total, rows] = await Promise.all([
    prisma.order.count({ where }),
    prisma.order.findMany({
      where,
      orderBy: { placedAt: "desc" },
      skip: (page - 1) * pageSize,
      take: pageSize,
      include: {
        items: {
          orderBy: { id: "asc" },
          select: {
            quantity: true,
            nameSnapshot: true,
            product: {
              select: {
                media: { orderBy: { sortOrder: "asc" }, take: 1, select: { url: true } },
              },
            },
          },
        },
      },
    }),
  ]);

  logCustomerEvent("customer.orders_listed", {
    tenantId: input.tenantId,
    customerId: input.customerId,
  });

  return {
    page,
    pageSize,
    total,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
    items: rows.map((order) => {
      const itemCount = order.items.reduce((sum, item) => sum + item.quantity, 0);
      return {
        orderNumber: order.orderNumber,
        placedAt: order.placedAt,
        status: order.status,
        statusLabel: customerOrderStatusLabel(order.status),
        fulfillmentMethod: order.fulfillmentMethod,
        paymentMethod: order.paymentMethod,
        itemCount,
        totalMinor: order.totalMinor,
        currency: order.currency,
        itemSummary: order.items
          .slice(0, 3)
          .map((i) => i.nameSnapshot)
          .join(", "),
        thumbnailUrl: order.items[0]?.product?.media[0]?.url ?? null,
      };
    }),
  };
}

export async function getCustomerOrderByNumber(input: {
  tenantId: string;
  customerId: string;
  tenantSlug: string;
  orderNumber: string;
}): Promise<CustomerOrderDetailDto> {
  const order = await prisma.order.findFirst({
    where: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      orderNumber: input.orderNumber,
    },
    include: {
      customer: true,
      items: {
        orderBy: { id: "asc" },
        include: {
          product: {
            include: {
              media: { orderBy: { sortOrder: "asc" }, take: 1 },
            },
          },
        },
      },
      statusHistory: { orderBy: { createdAt: "asc" } },
    },
  });

  if (!order) {
    logCustomerEvent("customer.order_access_denied", {
      tenantId: input.tenantId,
      customerId: input.customerId,
      orderNumber: input.orderNumber,
    });
    throw new AppError("NOT_FOUND", "Order not found");
  }

  const settings = await getStorefrontSettings(input.tenantId, input.tenantSlug);

  const recipientName = [order.recipientFirstName, order.recipientLastName]
    .filter(Boolean)
    .join(" ")
    .trim();

  return {
    orderNumber: order.orderNumber,
    placedAt: order.placedAt,
    status: order.status,
    statusLabel: customerOrderStatusLabel(order.status),
    channel: order.channel,
    fulfillmentMethod: order.fulfillmentMethod,
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    deliveryFeeMinor: order.deliveryFeeMinor,
    discountMinor: order.discountMinor,
    totalMinor: order.totalMinor,
    delivery:
      order.fulfillmentMethod === "delivery"
        ? {
            recipientName: recipientName || order.customer.displayName,
            phone: order.recipientPhone ?? order.customer.phone,
            addressLine1: order.addressLine,
            addressLine2: order.addressLine2,
            cityOrArea: order.cityOrArea,
            provinceOrState: order.provinceOrState,
            postalCode: order.postalCode,
            countryCode: order.countryCode,
            label: order.addressLabel,
            deliveryInstructions: order.deliveryInstructions,
          }
        : null,
    pickup:
      order.fulfillmentMethod === "pickup"
        ? {
            name: order.pickupLocationName,
            address: order.pickupLocationAddress,
          }
        : null,
    items: order.items.map((item) => ({
      name: item.nameSnapshot,
      quantity: item.quantity,
      unitPriceMinor: item.unitPriceMinor,
      lineTotalMinor: item.lineTotalMinor,
      imageUrl: item.product?.media[0]?.url ?? null,
      volume: item.volumeSnapshot,
      sellingUnit: item.sellingUnitSnapshot ?? "item",
    })),
    timeline: order.statusHistory.map((entry) => ({
      status: entry.toStatus,
      statusLabel: customerOrderStatusLabel(entry.toStatus),
      createdAt: entry.createdAt,
    })),
    supportPhone: settings.phone,
    supportEmail: settings.email,
  };
}
