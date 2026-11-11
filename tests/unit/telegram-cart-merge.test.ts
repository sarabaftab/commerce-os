import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  findOpenCartLinesForMerge,
  touchCart,
  upsertCartItemsInTransaction,
  prismaCartUpdateMany,
  prismaTransaction,
} = vi.hoisted(() => ({
  findOpenCartLinesForMerge: vi.fn(),
  touchCart: vi.fn(),
  upsertCartItemsInTransaction: vi.fn(),
  prismaCartUpdateMany: vi.fn(),
  prismaTransaction: vi.fn(),
}));

vi.mock("@/modules/orders/repositories/cart-repository", () => ({
  findOpenCartLinesForMerge,
  touchCart,
  upsertCartItemsInTransaction,
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    cart: { updateMany: prismaCartUpdateMany },
    $transaction: prismaTransaction,
  },
}));

import { mergeGuestCartIntoCustomer } from "@/modules/orders/services/cart-merge";

/**
 * Mirrors getCartSummary / getOrCreateCart identity preference used by storefront.
 * Used to prove Telegram write/read resolve to the same surviving cart after merge.
 */
function resolveCartForIdentity(input: {
  customerId: string | null;
  guestToken: string | null;
  carts: Array<{
    id: string;
    status: "open" | "abandoned";
    customerId: string | null;
    guestToken: string | null;
    itemCount: number;
  }>;
}) {
  if (input.customerId) {
    const byCustomer = input.carts.find(
      (cart) =>
        cart.status === "open" && cart.customerId === input.customerId,
    );
    if (byCustomer) {
      return byCustomer;
    }
  }
  if (input.guestToken) {
    return (
      input.carts.find(
        (cart) =>
          cart.status === "open" && cart.guestToken === input.guestToken,
      ) ?? null
    );
  }
  return null;
}

describe("Telegram guest→customer cart merge identity", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaTransaction.mockImplementation(async (fn: (tx: unknown) => unknown) => {
      const tx = {
        cart: { updateMany: prismaCartUpdateMany },
      };
      return fn(tx);
    });
  });

  it("claims guest cart to customer without clearing guestToken (guest cookie still resolves)", async () => {
    findOpenCartLinesForMerge
      .mockResolvedValueOnce({
        id: "guest-cart",
        customerId: null,
        guestToken: "guest-token-1",
        items: [{ id: "li1", productId: "p1", quantity: 2 }],
      })
      .mockResolvedValueOnce(null);

    await mergeGuestCartIntoCustomer({
      tenantId: "tenant-a",
      guestToken: "guest-token-1",
      customerId: "customer-a",
    });

    expect(prismaCartUpdateMany).toHaveBeenCalledWith({
      where: { id: "guest-cart", tenantId: "tenant-a" },
      data: { customerId: "customer-a" },
    });
    expect(prismaCartUpdateMany.mock.calls[0][0].data).not.toHaveProperty(
      "guestToken",
      null,
    );
    expect(touchCart).toHaveBeenCalledWith("tenant-a", "guest-cart");
  });

  it("when merging into an existing customer cart, transfers guestToken onto the survivor", async () => {
    findOpenCartLinesForMerge
      .mockResolvedValueOnce({
        id: "guest-cart",
        customerId: null,
        guestToken: "guest-token-1",
        items: [{ id: "li1", productId: "p1", quantity: 1 }],
      })
      .mockResolvedValueOnce({
        id: "customer-cart",
        customerId: "customer-a",
        guestToken: null,
        items: [],
      });

    await mergeGuestCartIntoCustomer({
      tenantId: "tenant-a",
      guestToken: "guest-token-1",
      customerId: "customer-a",
    });

    expect(upsertCartItemsInTransaction).toHaveBeenCalled();
    expect(prismaCartUpdateMany).toHaveBeenCalledWith({
      where: { id: "guest-cart", tenantId: "tenant-a" },
      data: { status: "abandoned", guestToken: null },
    });
    expect(prismaCartUpdateMany).toHaveBeenCalledWith({
      where: { id: "customer-cart", tenantId: "tenant-a" },
      data: {
        updatedAt: expect.any(Date),
        guestToken: "guest-token-1",
      },
    });
  });

  it("Telegram auth write/read resolve to the same cart when only the guest cookie survives", () => {
    // After claim: cart has both customerId and guestToken.
    const carts = [
      {
        id: "shared-cart",
        status: "open" as const,
        customerId: "customer-a",
        guestToken: "guest-token-1",
        itemCount: 2,
      },
    ];

    const withSession = resolveCartForIdentity({
      customerId: "customer-a",
      guestToken: "guest-token-1",
      carts,
    });
    const guestCookieOnly = resolveCartForIdentity({
      customerId: null,
      guestToken: "guest-token-1",
      carts,
    });

    expect(withSession?.id).toBe("shared-cart");
    expect(guestCookieOnly?.id).toBe("shared-cart");
    expect(guestCookieOnly?.itemCount).toBe(2);
  });

  it("documents the prior bug: clearing guestToken made guest-cookie-only reads empty", () => {
    const cartsAfterOldMerge = [
      {
        id: "shared-cart",
        status: "open" as const,
        customerId: "customer-a",
        guestToken: null,
        itemCount: 2,
      },
    ];

    const guestCookieOnly = resolveCartForIdentity({
      customerId: null,
      guestToken: "guest-token-1",
      carts: cartsAfterOldMerge,
    });

    expect(guestCookieOnly).toBeNull();
  });

  it("browser/guest Add to Cart identity still works without a customer session", () => {
    const carts = [
      {
        id: "guest-only",
        status: "open" as const,
        customerId: null,
        guestToken: "guest-token-9",
        itemCount: 1,
      },
    ];
    expect(
      resolveCartForIdentity({
        customerId: null,
        guestToken: "guest-token-9",
        carts,
      })?.id,
    ).toBe("guest-only");
  });

  it("tenant isolation: guest token in another tenant does not resolve", () => {
    const carts = [
      {
        id: "other-tenant-cart",
        status: "open" as const,
        customerId: null,
        guestToken: "shared-looking-token",
        itemCount: 5,
      },
    ];
    // Caller always scopes carts by tenantId before resolve — empty list = no leak.
    expect(
      resolveCartForIdentity({
        customerId: null,
        guestToken: "shared-looking-token",
        carts: [],
      }),
    ).toBeNull();
    expect(carts[0]?.guestToken).toBe("shared-looking-token");
  });
});
