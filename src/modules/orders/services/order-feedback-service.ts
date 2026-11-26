import { Prisma } from "@prisma/client";

import { composeDisplayName } from "@/modules/customers";
import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import {
  FEEDBACK_ELIGIBLE_ORDER_STATUS,
  type SubmitOrderFeedbackInput,
} from "../schemas/feedback";

export type OrderFeedbackDto = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
};

export type AdminOrderFeedbackListItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  orderId: string;
  orderNumber: string;
  customerId: string;
  customerDisplayName: string | null;
};

export type AdminOrderFeedbackListResult = {
  items: AdminOrderFeedbackListItem[];
  total: number;
  page: number;
  pageSize: number;
  totalPages: number;
  averageRating: number | null;
  feedbackCount: number;
};

export async function getOrderFeedbackForCustomerOrder(input: {
  tenantId: string;
  customerId: string;
  orderId: string;
}): Promise<OrderFeedbackDto | null> {
  const row = await prisma.orderFeedback.findFirst({
    where: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      orderId: input.orderId,
    },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
    },
  });
  return row;
}

/**
 * Submit first-and-only feedback for a completed order owned by the session customer.
 * Does not mutate order status or payment fields.
 */
export async function submitOrderFeedback(input: {
  tenantId: string;
  customerId: string;
  data: SubmitOrderFeedbackInput;
}): Promise<OrderFeedbackDto> {
  const order = await prisma.order.findFirst({
    where: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      orderNumber: input.data.orderNumber,
    },
    select: {
      id: true,
      status: true,
      feedback: { select: { id: true } },
    },
  });

  if (!order) {
    throw new AppError("NOT_FOUND", "Order not found");
  }

  if (order.status !== FEEDBACK_ELIGIBLE_ORDER_STATUS) {
    throw new AppError(
      "VALIDATION",
      "Feedback is only available after the order is delivered",
    );
  }

  if (order.feedback) {
    throw new AppError("CONFLICT", "Feedback has already been submitted for this order");
  }

  try {
    const created = await prisma.orderFeedback.create({
      data: {
        tenantId: input.tenantId,
        orderId: order.id,
        customerId: input.customerId,
        rating: input.data.rating,
        comment: input.data.comment ?? null,
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });
    return created;
  } catch (error) {
    if (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2002"
    ) {
      throw new AppError("CONFLICT", "Feedback has already been submitted for this order");
    }
    throw error;
  }
}

export async function getOrderFeedbackForAdmin(
  tenantId: string,
  orderId: string,
): Promise<OrderFeedbackDto | null> {
  return prisma.orderFeedback.findFirst({
    where: { tenantId, orderId },
    select: {
      id: true,
      rating: true,
      comment: true,
      createdAt: true,
    },
  });
}

export async function listOrderFeedbackForAdminTenant(
  tenantId: string,
  input: { page?: number; pageSize?: number } = {},
): Promise<AdminOrderFeedbackListResult> {
  const page = Math.max(1, input.page ?? 1);
  const pageSize = Math.min(50, Math.max(1, input.pageSize ?? 20));
  const skip = (page - 1) * pageSize;

  const where = { tenantId };

  const [total, rows, aggregate] = await Promise.all([
    prisma.orderFeedback.count({ where }),
    prisma.orderFeedback.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip,
      take: pageSize,
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
        orderId: true,
        customerId: true,
        order: { select: { orderNumber: true } },
        customer: {
          select: {
            displayName: true,
            firstName: true,
            lastName: true,
          },
        },
      },
    }),
    prisma.orderFeedback.aggregate({
      where,
      _avg: { rating: true },
      _count: { _all: true },
    }),
  ]);

  return {
    items: rows.map((row) => ({
      id: row.id,
      rating: row.rating,
      comment: row.comment,
      createdAt: row.createdAt,
      orderId: row.orderId,
      orderNumber: row.order.orderNumber,
      customerId: row.customerId,
      customerDisplayName: composeDisplayName(row.customer),
    })),
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize) || 1),
    averageRating:
      aggregate._avg.rating != null
        ? Math.round(aggregate._avg.rating * 10) / 10
        : null,
    feedbackCount: aggregate._count._all,
  };
}
