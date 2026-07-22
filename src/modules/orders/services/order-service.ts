import type {
  FulfillmentMethod,
  IdentityChannel,
  PaymentMethod,
  Prisma,
} from "@prisma/client";
import { Prisma as PrismaNamespace } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import {
  allocateOrderNumber,
  createOrderRecordInTransaction,
  findOrderByIdempotencyKey,
  orderInclude,
  toOrderConfirmation,
} from "../repositories/order-repository";
import type { OrderConfirmation } from "../types";
import { recordInitialOrderStatus } from "./order-status-service";

/**
 * Channel-agnostic order creation command.
 * Web checkout, Telegram, WhatsApp, and future recurring jobs should all
 * build this command and call `createOrder` — never insert orders from UI/routes.
 */
export type CreateOrderCommand = {
  tenantId: string;
  tenantSlug: string;
  customerId: string;
  channel: IdentityChannel;
  currency: string;
  idempotencyKey?: string;
  fulfillmentMethod: FulfillmentMethod;
  addressLine?: string;
  cityOrArea?: string;
  deliveryInstructions?: string;
  pickupLocationKey?: string;
  pickupLocationName?: string;
  pickupLocationAddress?: string;
  paymentMethod: PaymentMethod;
  paymentReference?: string;
  /** Explicit money breakdown — never trust a single client total. */
  subtotalMinor: number;
  deliveryFeeMinor: number;
  discountMinor: number;
  totalMinor: number;
  /** Optional attribution placeholders — no promotion/referral logic yet. */
  promotionId?: string;
  referralCode?: string;
  campaignId?: string;
  items: {
    productId: string;
    nameSnapshot: string;
    unitPriceMinor: number;
    quantity: number;
    lineTotalMinor: number;
  }[];
};

export type CreateOrderOptions = {
  /**
   * Optional work inside the same DB transaction after the order exists
   * (e.g. convert cart). Keep channel/cart specifics out of the Order model.
   */
  afterCreateInTransaction?: (
    tx: Prisma.TransactionClient,
    order: OrderConfirmation,
  ) => Promise<void>;
};

function assertMoneyBreakdown(command: CreateOrderCommand) {
  const { subtotalMinor, deliveryFeeMinor, discountMinor, totalMinor, items } = command;

  if (!Number.isInteger(subtotalMinor) || subtotalMinor < 0) {
    throw new AppError("VALIDATION", "Invalid subtotal");
  }
  if (!Number.isInteger(deliveryFeeMinor) || deliveryFeeMinor < 0) {
    throw new AppError("VALIDATION", "Invalid delivery fee");
  }
  if (!Number.isInteger(discountMinor) || discountMinor < 0) {
    throw new AppError("VALIDATION", "Invalid discount");
  }
  if (!Number.isInteger(totalMinor) || totalMinor < 0) {
    throw new AppError("VALIDATION", "Invalid total");
  }
  if (items.length === 0) {
    throw new AppError("VALIDATION", "Order must include at least one item");
  }

  const linesSum = items.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  if (linesSum !== subtotalMinor) {
    throw new AppError("VALIDATION", "Subtotal does not match order items");
  }

  const expectedTotal = subtotalMinor - discountMinor + deliveryFeeMinor;
  if (expectedTotal !== totalMinor) {
    throw new AppError("VALIDATION", "Total does not match money breakdown");
  }
}

/**
 * Create an order inside an existing transaction (for adapters that already
 * hold a tx — e.g. checkout resolving cart + customer atomically).
 */
export async function createOrderInTransaction(
  tx: Prisma.TransactionClient,
  command: CreateOrderCommand,
): Promise<OrderConfirmation> {
  assertMoneyBreakdown(command);

  if (command.idempotencyKey) {
    const replay = await tx.order.findFirst({
      where: {
        tenantId: command.tenantId,
        idempotencyKey: command.idempotencyKey,
      },
      include: orderInclude,
    });
    if (replay) {
      return toOrderConfirmation(replay);
    }
  }

  const orderNumber = await allocateOrderNumber(tx, command.tenantId, command.tenantSlug);

  const record = await createOrderRecordInTransaction(tx, {
    tenantId: command.tenantId,
    customerId: command.customerId,
    orderNumber,
    channel: command.channel,
    idempotencyKey: command.idempotencyKey,
    fulfillmentMethod: command.fulfillmentMethod,
    addressLine: command.addressLine,
    cityOrArea: command.cityOrArea,
    deliveryInstructions: command.deliveryInstructions,
    pickupLocationKey: command.pickupLocationKey,
    pickupLocationName: command.pickupLocationName,
    pickupLocationAddress: command.pickupLocationAddress,
    paymentMethod: command.paymentMethod,
    paymentReference: command.paymentReference,
    currency: command.currency,
    subtotalMinor: command.subtotalMinor,
    deliveryFeeMinor: command.deliveryFeeMinor,
    discountMinor: command.discountMinor,
    totalMinor: command.totalMinor,
    promotionId: command.promotionId,
    referralCode: command.referralCode,
    campaignId: command.campaignId,
    items: command.items,
  });

  await recordInitialOrderStatus(tx, {
    tenantId: command.tenantId,
    orderId: record.id,
  });

  return toOrderConfirmation(record);
}

/**
 * Application service: create an order with explicit money fields, channel,
 * optional attribution, and initial status history.
 *
 * Safe for guest checkout, channel bots, and future recurring order runners.
 * Idempotent when `idempotencyKey` is provided.
 */
export async function createOrder(
  command: CreateOrderCommand,
  options: CreateOrderOptions = {},
): Promise<OrderConfirmation> {
  if (command.idempotencyKey) {
    const existing = await findOrderByIdempotencyKey(
      command.tenantId,
      command.idempotencyKey,
    );
    if (existing) {
      return existing;
    }
  }

  try {
    return await prisma.$transaction(async (tx) => {
      const order = await createOrderInTransaction(tx, command);
      if (options.afterCreateInTransaction) {
        await options.afterCreateInTransaction(tx, order);
      }
      return order;
    });
  } catch (error) {
    if (
      error instanceof PrismaNamespace.PrismaClientKnownRequestError &&
      error.code === "P2002" &&
      command.idempotencyKey
    ) {
      const replay = await findOrderByIdempotencyKey(
        command.tenantId,
        command.idempotencyKey,
      );
      if (replay) {
        return replay;
      }
    }
    throw error;
  }
}
