import type {
  FulfillmentMethod,
  IdentityChannel,
  PaymentMethod,
  Prisma,
  SellingUnit,
} from "@prisma/client";

import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";
import { createOrderConfirmationToken } from "@/shared/orders/confirmation-cookie";
import { normalizePhoneToE164 } from "@/shared/phone/normalize-phone";

import type { OrderConfirmation, OrderLineView } from "../types";
import { initialPaymentProofStatus } from "../payment-proof";

export const orderInclude = {
  customer: true,
  items: { orderBy: { id: "asc" as const } },
} as const;

export type OrderWithRelations = Prisma.OrderGetPayload<{ include: typeof orderInclude }>;

export function toOrderConfirmation(
  order: OrderWithRelations,
  options?: { includeConfirmationToken?: boolean },
): OrderConfirmation {
  const items: OrderLineView[] = order.items.map((item) => ({
    id: item.id,
    productId: item.productId,
    name: item.nameSnapshot,
    quantity: item.quantity,
    unitPriceMinor: item.unitPriceMinor,
    lineTotalMinor: item.lineTotalMinor,
    volume: item.volumeSnapshot,
    sellingUnit: item.sellingUnitSnapshot ?? "item",
  }));

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
    promotionId: order.promotionId,
    referralCode: order.referralCode,
    campaignId: order.campaignId,
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
    ...(options?.includeConfirmationToken
      ? { confirmationToken: order.confirmationToken }
      : {}),
    customer: {
      displayName: order.customer.displayName,
      phone: order.customer.phone,
      email: order.customer.email,
    },
    items,
  };
}

export async function findOrderById(
  tenantId: string,
  orderId: string,
): Promise<OrderWithRelations | null> {
  return prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: orderInclude,
  });
}

export async function findOrderByIdempotencyKey(
  tenantId: string,
  idempotencyKey: string,
): Promise<OrderConfirmation | null> {
  const order = await prisma.order.findFirst({
    where: { tenantId, idempotencyKey },
    include: orderInclude,
  });
  return order ? toOrderConfirmation(order, { includeConfirmationToken: true }) : null;
}

export async function findOrderByOrderNumber(
  tenantId: string,
  orderNumber: string,
): Promise<OrderWithRelations | null> {
  return prisma.order.findFirst({
    where: { tenantId, orderNumber },
    include: orderInclude,
  });
}

export async function findOrderByConfirmationToken(
  tenantId: string,
  orderNumber: string,
  confirmationToken: string,
): Promise<OrderWithRelations | null> {
  return prisma.order.findFirst({
    where: {
      tenantId,
      orderNumber,
      confirmationToken,
    },
    include: orderInclude,
  });
}

export async function findOwnedOrderByOrderNumber(
  tenantId: string,
  customerId: string,
  orderNumber: string,
): Promise<OrderWithRelations | null> {
  return prisma.order.findFirst({
    where: { tenantId, customerId, orderNumber },
    include: orderInclude,
  });
}

export type CreateOrderRecordInput = {
  tenantId: string;
  customerId: string;
  orderNumber: string;
  channel: IdentityChannel;
  idempotencyKey?: string;
  fulfillmentMethod: FulfillmentMethod;
  addressLine?: string;
  addressLine2?: string;
  cityOrArea?: string;
  provinceOrState?: string;
  postalCode?: string;
  countryCode?: string;
  recipientFirstName?: string;
  recipientLastName?: string;
  recipientPhone?: string;
  addressLabel?: string;
  sourceAddressId?: string;
  deliveryInstructions?: string;
  pickupLocationKey?: string;
  pickupLocationName?: string;
  pickupLocationAddress?: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  currency: string;
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  promotionId?: string;
  referralCode?: string;
  campaignId?: string;
  items: {
    productId: string;
    nameSnapshot: string;
    volumeSnapshot?: string | null;
    sellingUnitSnapshot?: SellingUnit | null;
    unitPriceMinor: number;
    quantity: number;
    lineTotalMinor: number;
  }[];
  confirmationToken?: string;
};

/**
 * Low-level insert of order + items. Prefer `createOrder` in order-service
 * for application orchestration (idempotency, numbering, initial status).
 */
export async function createOrderRecordInTransaction(
  tx: Prisma.TransactionClient,
  input: CreateOrderRecordInput,
): Promise<OrderWithRelations> {
  return tx.order.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      orderNumber: input.orderNumber,
      status: "pending",
      fulfillmentMethod: input.fulfillmentMethod,
      addressLine: input.addressLine ?? null,
      addressLine2: input.addressLine2 ?? null,
      cityOrArea: input.cityOrArea ?? null,
      provinceOrState: input.provinceOrState ?? null,
      postalCode: input.postalCode ?? null,
      countryCode: input.countryCode ?? null,
      recipientFirstName: input.recipientFirstName ?? null,
      recipientLastName: input.recipientLastName ?? null,
      recipientPhone: input.recipientPhone ?? null,
      addressLabel: input.addressLabel ?? null,
      sourceAddressId: input.sourceAddressId ?? null,
      deliveryInstructions: input.deliveryInstructions ?? null,
      pickupLocationKey: input.pickupLocationKey ?? null,
      pickupLocationName: input.pickupLocationName ?? null,
      pickupLocationAddress: input.pickupLocationAddress ?? null,
      paymentMethod: input.paymentMethod,
      paymentReference: input.paymentReference ?? null,
      paymentProofStatus: initialPaymentProofStatus(input.paymentMethod),
      currency: input.currency,
      subtotalMinor: input.subtotalMinor,
      deliveryFeeMinor: input.deliveryFeeMinor,
      discountMinor: input.discountMinor,
      totalMinor: input.totalMinor,
      channel: input.channel,
      promotionId: input.promotionId ?? null,
      referralCode: input.referralCode ?? null,
      campaignId: input.campaignId ?? null,
      idempotencyKey: input.idempotencyKey ?? null,
      confirmationToken: input.confirmationToken ?? createOrderConfirmationToken(),
      items: {
        create: input.items.map((item) => ({
          tenantId: input.tenantId,
          productId: item.productId,
          nameSnapshot: item.nameSnapshot,
          volumeSnapshot: item.volumeSnapshot ?? null,
          sellingUnitSnapshot: item.sellingUnitSnapshot ?? null,
          unitPriceMinor: item.unitPriceMinor,
          quantity: item.quantity,
          lineTotalMinor: item.lineTotalMinor,
        })),
      },
    },
    include: orderInclude,
  });
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
  let sequence = tenant.orderSequence > 0 ? tenant.orderSequence : 1;

  // Skip numbers that already exist (e.g. after seed reset orderSequence).
  for (let attempt = 0; attempt < 50; attempt += 1) {
    const orderNumber = formatOrderNumber(tenantSlug, sequence);
    const exists = await tx.order.findFirst({
      where: { tenantId, orderNumber },
      select: { id: true },
    });
    if (!exists) {
      await tx.tenant.update({
        where: { id: tenantId },
        data: { orderSequence: sequence + 1 },
      });
      return orderNumber;
    }
    sequence += 1;
  }

  throw new Error("Unable to allocate a unique order number");
}

export async function convertCartInTransaction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  cartId: string,
  customerId: string,
) {
  const claimed = await tx.cart.updateMany({
    where: {
      id: cartId,
      tenantId,
      status: "open",
    },
    data: {
      status: "converted",
      customerId,
      guestToken: null,
    },
  });

  if (claimed.count !== 1) {
    throw new AppError("CONFLICT", "This cart was already checked out");
  }

  await tx.cartItem.deleteMany({ where: { tenantId, cartId } });
}

export const adminOrderListInclude = {
  customer: {
    select: {
      id: true,
      displayName: true,
      phone: true,
      email: true,
    },
  },
} as const;

export const adminOrderDetailInclude = {
  customer: true,
  items: { orderBy: { id: "asc" as const } },
  statusHistory: { orderBy: { createdAt: "asc" as const } },
} as const;

export type AdminOrderListRow = Prisma.OrderGetPayload<{
  include: typeof adminOrderListInclude;
}>;

export type AdminOrderDetailRecord = Prisma.OrderGetPayload<{
  include: typeof adminOrderDetailInclude;
}>;

export type ListOrdersForAdminParams = {
  tenantId: string;
  q?: string;
  status?: string;
  paymentMethod?: string;
  fulfillmentMethod?: string;
  placedFrom?: Date;
  placedTo?: Date;
  skip: number;
  take: number;
};

export async function listOrdersForAdmin(params: ListOrdersForAdminParams) {
  const where: Prisma.OrderWhereInput = {
    tenantId: params.tenantId,
  };

  if (params.status) {
    where.status = params.status as Prisma.EnumOrderStatusFilter["equals"];
  }
  if (params.paymentMethod) {
    where.paymentMethod = params.paymentMethod as Prisma.EnumPaymentMethodFilter["equals"];
  }
  if (params.fulfillmentMethod) {
    where.fulfillmentMethod =
      params.fulfillmentMethod as Prisma.EnumFulfillmentMethodFilter["equals"];
  }
  if (params.placedFrom || params.placedTo) {
    where.placedAt = {
      ...(params.placedFrom ? { gte: params.placedFrom } : {}),
      ...(params.placedTo ? { lte: params.placedTo } : {}),
    };
  }

  const q = params.q?.trim();
  if (q) {
    const phoneDigits = q.replace(/\D/g, "");
    const e164 = normalizePhoneToE164(q);
    where.OR = [
      { orderNumber: { contains: q, mode: "insensitive" } },
      { customer: { displayName: { contains: q, mode: "insensitive" } } },
      ...(phoneDigits
        ? [
            { customer: { phone: { contains: phoneDigits } } },
            { customer: { phoneNormalized: { contains: phoneDigits } } },
            ...(e164 ? [{ customer: { phoneNormalized: e164 } }] : []),
          ]
        : [{ customer: { phone: { contains: q } } }]),
    ];
  }

  const [rows, total] = await Promise.all([
    prisma.order.findMany({
      where,
      include: adminOrderListInclude,
      orderBy: { placedAt: "desc" },
      skip: params.skip,
      take: params.take,
    }),
    prisma.order.count({ where }),
  ]);

  return { rows, total };
}

export async function findOrderDetailForAdmin(
  tenantId: string,
  orderId: string,
): Promise<AdminOrderDetailRecord | null> {
  return prisma.order.findFirst({
    where: { id: orderId, tenantId },
    include: adminOrderDetailInclude,
  });
}
