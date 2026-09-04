import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  compareOrderSequence,
  customerLifecycleLabel,
  orderCustomerTypeLabel,
  resolveOrderCustomerType,
} from "@/modules/orders/customer-type";

describe("order customer type", () => {
  const t1 = new Date("2026-01-01T10:00:00.000Z");
  const t2 = new Date("2026-01-02T10:00:00.000Z");
  const t3 = new Date("2026-01-03T10:00:00.000Z");

  it("marks the first order as New Customer", () => {
    const first = { id: "o1", placedAt: t1 };
    expect(resolveOrderCustomerType(first, first)).toBe("new");
    expect(orderCustomerTypeLabel("new")).toBe("New Customer");
  });

  it("marks second and later orders as Returning Customer", () => {
    const first = { id: "o1", placedAt: t1 };
    expect(resolveOrderCustomerType({ id: "o2", placedAt: t2 }, first)).toBe("returning");
    expect(resolveOrderCustomerType({ id: "o3", placedAt: t3 }, first)).toBe("returning");
    expect(orderCustomerTypeLabel("returning")).toBe("Returning Customer");
  });

  it("uses id as a deterministic tie-breaker when placedAt matches", () => {
    const a = { id: "aaa", placedAt: t1 };
    const b = { id: "bbb", placedAt: t1 };
    expect(compareOrderSequence(a, b)).toBeLessThan(0);
    expect(resolveOrderCustomerType(b, a)).toBe("returning");
  });

  it("labels customer lifecycle from total order count", () => {
    expect(customerLifecycleLabel(0)).toBe("New");
    expect(customerLifecycleLabel(1)).toBe("New");
    expect(customerLifecycleLabel(2)).toBe("Returning");
  });
});

const { customerFindFirst, orderCount, orderFindMany, orderAggregate, orderFindFirst } =
  vi.hoisted(() => ({
    customerFindFirst: vi.fn(),
    orderCount: vi.fn(),
    orderFindMany: vi.fn(),
    orderAggregate: vi.fn(),
    orderFindFirst: vi.fn(),
  }));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    customer: { findFirst: customerFindFirst },
    order: {
      count: orderCount,
      findMany: orderFindMany,
      aggregate: orderAggregate,
      findFirst: orderFindFirst,
      groupBy: vi.fn(),
    },
    $queryRaw: vi.fn(),
  },
}));

describe("getCustomerProfileForAdmin", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("returns NOT_FOUND for a missing/cross-tenant customer", async () => {
    const { getCustomerProfileForAdmin } = await import(
      "@/modules/customers/services/customer-admin-service"
    );
    customerFindFirst.mockResolvedValue(null);

    await expect(
      getCustomerProfileForAdmin("tenant-a", "cust-b"),
    ).rejects.toMatchObject({ code: "NOT_FOUND", status: 404 });

    expect(customerFindFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          id: "cust-b",
          tenantId: "tenant-a",
          deletedAt: null,
        }),
      }),
    );
  });

  it("builds profile totals and order history customer types", async () => {
    const { getCustomerProfileForAdmin } = await import(
      "@/modules/customers/services/customer-admin-service"
    );

    const t1 = new Date("2026-01-01T10:00:00.000Z");
    const t2 = new Date("2026-01-02T10:00:00.000Z");

    customerFindFirst.mockResolvedValue({
      id: "cust-1",
      displayName: "Nasa",
      firstName: null,
      lastName: null,
      phone: "+85581359595",
      email: null,
      createdAt: t1,
      identities: [{ id: "tg-1" }],
    });
    orderCount.mockResolvedValue(2);
    orderFindMany.mockResolvedValue([
      {
        id: "o2",
        orderNumber: "ORD-2",
        status: "pending",
        paymentMethod: "cod",
        paymentProofStatus: "not_required",
        fulfillmentMethod: "delivery",
        totalMinor: 2000,
        currency: "USD",
        placedAt: t2,
      },
      {
        id: "o1",
        orderNumber: "ORD-1",
        status: "completed",
        paymentMethod: "cod",
        paymentProofStatus: "not_required",
        fulfillmentMethod: "delivery",
        totalMinor: 1000,
        currency: "USD",
        placedAt: t1,
      },
    ]);
    orderAggregate.mockResolvedValue({ _sum: { totalMinor: 3000 } });
    orderFindFirst
      .mockResolvedValueOnce({ id: "o1", placedAt: t1, currency: "USD" })
      .mockResolvedValueOnce({
        id: "o2",
        orderNumber: "ORD-2",
        status: "pending",
        placedAt: t2,
        currency: "USD",
      });

    const profile = await getCustomerProfileForAdmin("tenant-a", "cust-1");

    expect(profile.totalOrders).toBe(2);
    expect(profile.lifetimeValueMinor).toBe(3000);
    expect(profile.lifecycle).toBe("Returning");
    expect(profile.telegramLinked).toBe(true);
    expect(profile.orders[0]?.customerType).toBe("returning");
    expect(profile.orders[1]?.customerType).toBe("new");
    expect(profile.lastOrderNumber).toBe("ORD-2");
    expect(profile.customerSince).toEqual(t1);
  });
});
