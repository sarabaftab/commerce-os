import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  orderFindFirst,
  feedbackFindFirst,
  feedbackCreate,
  feedbackCount,
  feedbackFindMany,
  feedbackAggregate,
} = vi.hoisted(() => ({
  orderFindFirst: vi.fn(),
  feedbackFindFirst: vi.fn(),
  feedbackCreate: vi.fn(),
  feedbackCount: vi.fn(),
  feedbackFindMany: vi.fn(),
  feedbackAggregate: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    order: { findFirst: orderFindFirst },
    orderFeedback: {
      findFirst: feedbackFindFirst,
      create: feedbackCreate,
      count: feedbackCount,
      findMany: feedbackFindMany,
      aggregate: feedbackAggregate,
    },
  },
}));

import { AppError } from "@/shared/errors/app-error";
import {
  normalizeFeedbackInput,
  submitOrderFeedbackSchema,
} from "@/modules/orders/schemas/feedback";
import {
  listOrderFeedbackForAdminTenant,
  submitOrderFeedback,
} from "@/modules/orders/services/order-feedback-service";

describe("submitOrderFeedbackSchema", () => {
  it("accepts a valid rating and optional comment", () => {
    expect(
      normalizeFeedbackInput(
        submitOrderFeedbackSchema.parse({
          orderNumber: "ORD-1",
          rating: "5",
          comment: " Great milk ",
        }),
      ),
    ).toEqual({
      orderNumber: "ORD-1",
      rating: 5,
      comment: "Great milk",
    });
  });

  it("rejects ratings outside 1–5", () => {
    expect(() =>
      submitOrderFeedbackSchema.parse({ orderNumber: "ORD-1", rating: 0 }),
    ).toThrow();
    expect(() =>
      submitOrderFeedbackSchema.parse({ orderNumber: "ORD-1", rating: 6 }),
    ).toThrow();
  });

  it("rejects excessively long comments", () => {
    expect(() =>
      submitOrderFeedbackSchema.parse({
        orderNumber: "ORD-1",
        rating: 4,
        comment: "x".repeat(1001),
      }),
    ).toThrow(/too long/i);
  });
});

describe("submitOrderFeedback", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("creates feedback for the customer's completed order", async () => {
    orderFindFirst.mockResolvedValue({
      id: "order-1",
      status: "completed",
      feedback: null,
    });
    feedbackCreate.mockResolvedValue({
      id: "fb-1",
      rating: 5,
      comment: "Excellent",
      createdAt: new Date("2026-11-10T00:00:00.000Z"),
    });

    const result = await submitOrderFeedback({
      tenantId: "tenant-a",
      customerId: "cust-1",
      data: { orderNumber: "ORD-1", rating: 5, comment: "Excellent" },
    });

    expect(result.rating).toBe(5);
    expect(orderFindFirst).toHaveBeenCalledWith({
      where: {
        tenantId: "tenant-a",
        customerId: "cust-1",
        orderNumber: "ORD-1",
      },
      select: {
        id: true,
        status: true,
        feedback: { select: { id: true } },
      },
    });
    expect(feedbackCreate).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-a",
        orderId: "order-1",
        customerId: "cust-1",
        rating: 5,
        comment: "Excellent",
      },
      select: {
        id: true,
        rating: true,
        comment: true,
        createdAt: true,
      },
    });
  });

  it("rejects feedback for undelivered orders", async () => {
    orderFindFirst.mockResolvedValue({
      id: "order-1",
      status: "out_for_delivery",
      feedback: null,
    });

    await expect(
      submitOrderFeedback({
        tenantId: "tenant-a",
        customerId: "cust-1",
        data: { orderNumber: "ORD-1", rating: 4 },
      }),
    ).rejects.toMatchObject({
      code: "VALIDATION",
      message: expect.stringMatching(/delivered/i),
    } satisfies Partial<AppError>);
    expect(feedbackCreate).not.toHaveBeenCalled();
  });

  it("rejects another customer's order as not found", async () => {
    orderFindFirst.mockResolvedValue(null);

    await expect(
      submitOrderFeedback({
        tenantId: "tenant-a",
        customerId: "cust-other",
        data: { orderNumber: "ORD-1", rating: 3 },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("rejects cross-tenant access because the order lookup is tenant-scoped", async () => {
    orderFindFirst.mockResolvedValue(null);

    await expect(
      submitOrderFeedback({
        tenantId: "tenant-b",
        customerId: "cust-1",
        data: { orderNumber: "ORD-1", rating: 5 },
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });

    expect(orderFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({ tenantId: "tenant-b" }),
      }),
    );
  });

  it("rejects a second submission for the same order", async () => {
    orderFindFirst.mockResolvedValue({
      id: "order-1",
      status: "completed",
      feedback: { id: "fb-existing" },
    });

    await expect(
      submitOrderFeedback({
        tenantId: "tenant-a",
        customerId: "cust-1",
        data: { orderNumber: "ORD-1", rating: 2 },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(feedbackCreate).not.toHaveBeenCalled();
  });

  it("maps unique-constraint races to CONFLICT", async () => {
    orderFindFirst.mockResolvedValue({
      id: "order-1",
      status: "completed",
      feedback: null,
    });
    const { Prisma } = await import("@prisma/client");
    feedbackCreate.mockRejectedValue(
      new Prisma.PrismaClientKnownRequestError("Unique constraint failed", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(
      submitOrderFeedback({
        tenantId: "tenant-a",
        customerId: "cust-1",
        data: { orderNumber: "ORD-1", rating: 5 },
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("does not update order status when creating feedback", async () => {
    orderFindFirst.mockResolvedValue({
      id: "order-1",
      status: "completed",
      feedback: null,
    });
    feedbackCreate.mockResolvedValue({
      id: "fb-1",
      rating: 4,
      comment: null,
      createdAt: new Date(),
    });

    await submitOrderFeedback({
      tenantId: "tenant-a",
      customerId: "cust-1",
      data: { orderNumber: "ORD-1", rating: 4 },
    });

    expect(feedbackCreate.mock.calls[0][0].data).not.toHaveProperty("status");
    expect(Object.keys(feedbackCreate.mock.calls[0][0].data).sort()).toEqual([
      "comment",
      "customerId",
      "orderId",
      "rating",
      "tenantId",
    ]);
  });
});

describe("listOrderFeedbackForAdminTenant", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns only the requested tenant's feedback with summary stats", async () => {
    feedbackCount.mockResolvedValue(2);
    feedbackFindMany.mockResolvedValue([
      {
        id: "fb-1",
        rating: 5,
        comment: "Great",
        createdAt: new Date("2026-11-10T00:00:00.000Z"),
        orderId: "order-1",
        customerId: "cust-1",
        order: { orderNumber: "ORD-1" },
        customer: { displayName: "Ada", firstName: null, lastName: null },
      },
    ]);
    feedbackAggregate.mockResolvedValue({
      _avg: { rating: 4.5 },
      _count: { _all: 2 },
    });

    const result = await listOrderFeedbackForAdminTenant("tenant-a", {
      page: 1,
      pageSize: 20,
    });

    expect(feedbackCount).toHaveBeenCalledWith({ where: { tenantId: "tenant-a" } });
    expect(feedbackFindMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { tenantId: "tenant-a" },
      }),
    );
    expect(result.averageRating).toBe(4.5);
    expect(result.feedbackCount).toBe(2);
    expect(result.items[0]?.customerDisplayName).toBe("Ada");
    expect(result.items[0]?.orderNumber).toBe("ORD-1");
  });
});
