import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  orderFindFirst,
  productFindMany,
  listActivePromotionsForTenant,
  getOrCreateCart,
  clearCartItems,
  upsertCartItem,
  touchCart,
  findCartById,
} = vi.hoisted(() => ({
  orderFindFirst: vi.fn(),
  productFindMany: vi.fn(),
  listActivePromotionsForTenant: vi.fn(),
  getOrCreateCart: vi.fn(),
  clearCartItems: vi.fn(),
  upsertCartItem: vi.fn(),
  touchCart: vi.fn(),
  findCartById: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    order: { findFirst: orderFindFirst },
    product: { findMany: productFindMany },
  },
}));

vi.mock("@/modules/promotions/repositories/promotion-repository", () => ({
  listActivePromotionsForTenant,
}));

vi.mock("@/modules/orders/services/cart-service", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/orders/services/cart-service")
  >("@/modules/orders/services/cart-service");
  return {
    ...actual,
    getOrCreateCart,
  };
});

vi.mock("@/modules/orders/repositories/cart-repository", async () => {
  const actual = await vi.importActual<
    typeof import("@/modules/orders/repositories/cart-repository")
  >("@/modules/orders/repositories/cart-repository");
  return {
    ...actual,
    clearCartItems,
    upsertCartItem,
    touchCart,
    findCartById,
  };
});

import { rebuildCartFromCustomerOrder } from "@/modules/orders/services/reorder-cart-service";

describe("rebuildCartFromCustomerOrder", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    listActivePromotionsForTenant.mockResolvedValue([]);
    getOrCreateCart.mockResolvedValue({
      cart: { id: "cart-1", items: [] },
      guestToken: undefined,
    });
    findCartById.mockResolvedValue({ id: "cart-1", items: [] });
    clearCartItems.mockResolvedValue(undefined);
    upsertCartItem.mockResolvedValue(undefined);
    touchCart.mockResolvedValue(undefined);
  });

  it("rejects cross-tenant or missing orders", async () => {
    orderFindFirst.mockResolvedValue(null);
    await expect(
      rebuildCartFromCustomerOrder({
        identity: { tenantId: "tenant-a", customerId: "cust-1" },
        tenantCurrency: "USD",
        orderNumber: "KIN-1",
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });

  it("adds available products at current stock limits and skips unavailable ones", async () => {
    orderFindFirst.mockResolvedValue({
      id: "ord-1",
      orderNumber: "KIN-1",
      items: [
        { productId: "p1", nameSnapshot: "Water", quantity: 5 },
        { productId: "p2", nameSnapshot: "Gone", quantity: 2 },
        { productId: null, nameSnapshot: "Legacy", quantity: 1 },
      ],
    });
    productFindMany.mockResolvedValue([
      {
        id: "p1",
        isAvailable: true,
        deletedAt: null,
        stockQuantity: 3,
      },
      {
        id: "p2",
        isAvailable: false,
        deletedAt: null,
        stockQuantity: 10,
      },
    ]);

    const result = await rebuildCartFromCustomerOrder({
      identity: { tenantId: "tenant-a", customerId: "cust-1" },
      tenantCurrency: "USD",
      orderNumber: "KIN-1",
    });

    expect(result.addedCount).toBe(1);
    expect(result.skipped.map((row) => row.reason)).toEqual([
      "unavailable",
      "missing_product",
    ]);
    expect(clearCartItems).toHaveBeenCalledWith("tenant-a", "cart-1");
    expect(upsertCartItem).toHaveBeenCalledWith(
      expect.objectContaining({
        productId: "p1",
        quantity: 3,
      }),
    );
  });
});
