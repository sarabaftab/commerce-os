import type { FulfillmentMethod, PaymentMethod, Prisma } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

import type { OrderConfirmation, OrderLineView } from "../types";

const orderInclude = {
  customer: true,
  items: { orderBy: { id: "asc" as const } },
} as const;

type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

function toOrderConfirmation(order: OrderWithRelations): OrderConfirmation {
  const items: OrderLineView[] = order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.nameSnapshot,
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
    lineTotalMinor: item.lineTotalMinor,
  }));

  return {
    id: order.id,
    orderNumber: order.orderNumber,
    status: order.status,
    currency: order.currency,
    subtotalMinor: order.subtotalMinor,
    deliveryFeeMinor: order.deliveryFeeMinor,
    discountMinor: order.discountMinor,
    totalMinor: order.totalMinor,
    fulfillmentMethod: order.fulfillmentMethod,
    addressLine: order.addressLine,
    cityOrArea: order.cityOrArea,
    deliveryInstructions: order.deliveryInstructions,
    pickupLocationKey: order.pickupLocationKey,
    pickupLocationName: order.pickupLocationName,
    paymentMethod: order.paymentMethod,
    paymentReference: order.paymentReference,
    placedAt: order.placedAt,
    customer: {
      displayName: order.customer.displayName,
      phone: order.customer.phone,
      email: order.customer.email,
    },
    items,
  };
}

export async function findOrderByIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
): Promise<OrderConfirmation | null> {
  const order = await prisma.order.findFirst({
    where: { tenantId, idempotencyKey },
    include: orderInclude,
  });
  return order ? toOrderConfirmation(order) : null;
}

export async function findOrderByOrderNumber(
  tenantId: string,
  orderNumber: string,
): Promise<OrderConfirmation | null> {
  const order = await prisma.order.findFirst({
    where: { tenantId, orderNumber },
    include: orderInclude,
  });
  return order ? toOrderConfirmation(order) : null;
}

export type CreateOrderInput = {
  tenantId: string;
  customerId: string;
  orderNumber: string;
  idempotencyKey: string;
  fulfillmentMethod: FulfillmentMethod;
  addressLine?: string;
  cityOrArea?: string;
  deliveryInstructions?: string;
  pickupLocationKey?: string;
  pickupLocationName?: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  currency: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  items: {
    productId: string;
    nameSnapshot: string;
    unitPriceMinor: number;
    quantity: number;
    lineTotalMinor: number;
  }[];
};

export async function createOrderInTransaction(
  tx: Prisma.TransactionClient,
  input: CreateOrderInput,
): Promise<OrderConfirmation> {
  const order = await tx.order.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      orderNumber: input.orderNumber,
      status: "pending",
      fulfillmentMethod: input.fulfillmentMethod,
      addressLine: input.addressLine ?? null,
      cityOrArea: input.cityOrArea ?? null,
      deliveryInstructions: input.deliveryInstructions ?? null,
      pickupLocationKey: input.pickupLocationKey ?? null,
      pickupLocationName: input.pickupLocationName ?? null,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference ?? null,
      currency: input.currency,
      subtotalMinor: input.subtotalMinor,
      deliveryFeeMinor: input.deliveryFeeMinor,
      discountMinor: input.discountMinor,
      totalMinor: input.totalMinor,
      channel: "web",
      idempotencyKey: input.idempotencyKey,
      items: {
        create: input.items.map((item) => ({
          tenantId: input.tenantId,
          productId: item.productId,
          nameSnapshot: item.nameSnapshot,
          unitPriceMinor: item.unitPriceMinor,
          quantity: item.quantity,
          lineTotalMinor: item.lineTotalMinor,
        })),
      },
      statusHistory: {
        create: {
          tenantId: input.tenantId,
          fromStatus: null,
          toStatus: "pending",
          note: "Order placed",
        },
      },
    },
    include: orderInclude,
  });

  return toOrderConfirmation(order);
}

export function formatOrderNumber(tenantSlug: string, sequence: number): string {
  return `${tenantSlug.toUpperCase()}-${String(sequence).padStart(6, "0")}`;
}

export async function allocateOrderNumber(
  tx: Prisma.TransactionClient,
  tenantId: string,
  tenantSlug: string,
): Promise<string> {
  const tenant = await tx.tenant.findUniqueOrThrow({ where: { id: tenantId } });
  const config = (tenant.config ?? {}) as Record<string, unknown>;
  const sequence =
    typeof config.orderSequence === "number" &&
    Number.isInteger(config.orderSequence) &&
    config.orderSequence > 0
      ? config.orderSequence
      : 1;

  const orderNumber = formatOrderNumber(tenantSlug, sequence);

  await tx.tenant.update({
    where: { id: tenantId },
    data: {
      config: {
        ...config,
        orderSequence: sequence + 1,
      },
    },
  });

  return orderNumber;
}

export async function convertCartInTransaction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  cartId: string,
  customerId: string,
) {
  await tx.cartItem.deleteMany({ where: { tenantId, cartId } });
  await tx.cart.update({
    where: { id: cartId },
    data: { status: "converted", customerId },
  });
}

export { toOrderConfirmation };
