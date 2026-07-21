import type { OrderStatus, Prisma } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import {
  findOrderById,
  toOrderConfirmation,
} from "../repositories/order-repository";
import type { OrderConfirmation } from "../types";

/**
 * Allowed status transitions. Keep this map the single source of truth —
 * admin UI, APIs, and future automation must call `transitionOrderStatus`
 * rather than updating `orders.status` directly.
 */
export const ALLOWED_ORDER_STATUS_TRANSITIONS: Record<
  OrderStatus,
  readonly OrderStatus[]
> = {
  pending: ["confirmed", "cancelled"],
  confirmed: ["processing", "cancelled"],
  processing: ["ready_for_pickup", "out_for_delivery", "cancelled"],
  ready_for_pickup: ["completed", "cancelled"],
  out_for_delivery: ["completed", "cancelled"],
  completed: [],
  cancelled: [],
};

export type TransitionOrderStatusInput = {
  tenantId: string;
  orderId: string;
  toStatus: OrderStatus;
  note?: string;
  createdBy?: string;
};

/**
 * Extension point for side effects after a successful status change.
 * Loyalty accrual, notifications, and channel webhooks should attach here later.
 * Do not award loyalty at checkout — only from completed (or other terminal) transitions.
 */
async function afterOrderStatusTransition(args: {
  tenantId: string;
  orderId: string;
  fromStatus: OrderStatus;
  toStatus: OrderStatus;
}): Promise<void> {
  void args;
  // Intentionally empty — no loyalty / notification implementations yet.
}

export function getAllowedNextStatuses(
  current: OrderStatus,
  fulfillmentMethod?: "delivery" | "pickup",
): OrderStatus[] {
  const allowed = [...ALLOWED_ORDER_STATUS_TRANSITIONS[current]];

  if (current === "processing" && fulfillmentMethod) {
    return allowed.filter((status) => {
      if (status === "ready_for_pickup") {
        return fulfillmentMethod === "pickup";
      }
      if (status === "out_for_delivery") {
        return fulfillmentMethod === "delivery";
      }
      return true;
    });
  }

  return allowed;
}

export async function recordInitialOrderStatus(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    orderId: string;
    note?: string;
    createdBy?: string;
  },
) {
  await tx.orderStatusHistory.create({
    data: {
      tenantId: input.tenantId,
      orderId: input.orderId,
      fromStatus: null,
      toStatus: "pending",
      note: input.note ?? "Order placed",
      createdBy: input.createdBy ?? null,
    },
  });
}

export async function transitionOrderStatus(
  input: TransitionOrderStatusInput,
): Promise<OrderConfirmation> {
  const order = await findOrderById(input.tenantId, input.orderId);
  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found");
  }

  const fromStatus = order.status;
  if (fromStatus === input.toStatus) {
    return toOrderConfirmation(order);
  }

  const allowed = ALLOWED_ORDER_STATUS_TRANSITIONS[fromStatus];
  if (!allowed.includes(input.toStatus)) {
    throw new AppError(
      "VALIDATION",
      `Cannot transition order from ${fromStatus} to ${input.toStatus}`,
    );
  }

  const updated = await prisma.$transaction(async (tx) => {
    const result = await tx.order.updateMany({
      where: { id: input.orderId, tenantId: input.tenantId, status: fromStatus },
      data: { status: input.toStatus },
    });

    if (result.count === 0) {
      throw new AppError("CONFLICT", "Order status changed concurrently");
    }

    await tx.orderStatusHistory.create({
      data: {
        tenantId: input.tenantId,
        orderId: input.orderId,
        fromStatus,
        toStatus: input.toStatus,
        note: input.note ?? null,
        createdBy: input.createdBy ?? null,
      },
    });

    return tx.order.findFirstOrThrow({
      where: { id: input.orderId, tenantId: input.tenantId },
      include: {
        customer: true,
        items: { orderBy: { id: "asc" } },
      },
    });
  });

  await afterOrderStatusTransition({
    tenantId: input.tenantId,
    orderId: input.orderId,
    fromStatus,
    toStatus: input.toStatus,
  });

  return toOrderConfirmation(updated);
}
