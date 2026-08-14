import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";
import type { Prisma } from "@prisma/client";

import type { CartWithItems } from "../types";

const cartInclude = {
  items: {
    include: {
      product: {
        include: {
          media: { orderBy: { sortOrder: "asc" as const }, take: 1 },
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

/** Checkout pricing only — no media join (images unused in order creation). */
const checkoutCartInclude = {
  items: {
    include: {
      product: {
        select: {
          id: true,
          name: true,
          priceMinor: true,
          isAvailable: true,
          deletedAt: true,
        },
      },
    },
    orderBy: { createdAt: "asc" as const },
  },
} as const;

export type CheckoutCartWithItems = {
  id: string;
  tenantId: string;
  customerId: string | null;
  guestToken: string | null;
  status: string;
  items: {
    id: string;
    productId: string;
    quantity: number;
    product: {
      id: string;
      name: string;
      priceMinor: number;
      isAvailable: boolean;
      deletedAt: Date | null;
    };
  }[];
};

export async function findOpenCartByGuestToken(
  tenantId: string,
  guestToken: string,
): Promise<CartWithItems | null> {
  return prisma.cart.findFirst({
    where: {
      tenantId,
      guestToken,
      status: "open",
    },
    include: cartInclude,
  });
}

export async function findOpenCartByCustomerId(
  tenantId: string,
  customerId: string,
): Promise<CartWithItems | null> {
  return prisma.cart.findFirst({
    where: {
      tenantId,
      customerId,
      status: "open",
    },
    include: cartInclude,
  });
}

/** Lightweight badge count — no product/media joins. Prefer customer cart, else guest. */
export async function sumOpenCartItemQuantities(input: {
  tenantId: string;
  customerId?: string | null;
  guestToken?: string | null;
}): Promise<number> {
  let cart:
    | {
        items: { quantity: number }[];
      }
    | null = null;

  if (input.customerId) {
    cart = await prisma.cart.findFirst({
      where: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        status: "open",
      },
      select: {
        items: {
          where: {
            product: {
              deletedAt: null,
              isAvailable: true,
            },
          },
          select: { quantity: true },
        },
      },
    });
  }

  if (!cart && input.guestToken) {
    cart = await prisma.cart.findFirst({
      where: {
        tenantId: input.tenantId,
        guestToken: input.guestToken,
        status: "open",
      },
      select: {
        items: {
          where: {
            product: {
              deletedAt: null,
              isAvailable: true,
            },
          },
          select: { quantity: true },
        },
      },
    });
  }

  if (!cart) {
    return 0;
  }

  return cart.items.reduce((sum, item) => sum + item.quantity, 0);
}

export async function findCartById(
  tenantId: string,
  cartId: string,
): Promise<CartWithItems | null> {
  return prisma.cart.findFirst({
    where: { id: cartId, tenantId, status: "open" },
    include: cartInclude,
  });
}

export async function createGuestCart(tenantId: string, guestToken: string) {
  return prisma.cart.create({
    data: {
      tenantId,
      guestToken,
      status: "open",
    },
    include: cartInclude,
  });
}

export async function createCustomerCart(tenantId: string, customerId: string) {
  return prisma.cart.create({
    data: {
      tenantId,
      customerId,
      status: "open",
    },
    include: cartInclude,
  });
}

export async function findCartItemById(tenantId: string, itemId: string) {
  return prisma.cartItem.findFirst({
    where: { id: itemId, tenantId },
    include: { cart: true },
  });
}

export async function upsertCartItem(input: {
  tenantId: string;
  cartId: string;
  productId: string;
  quantity: number;
  /** Skip open-cart ownership check when caller already verified the cart. */
  skipCartCheck?: boolean;
}) {
  if (!input.skipCartCheck) {
    const cart = await prisma.cart.findFirst({
      where: {
        id: input.cartId,
        tenantId: input.tenantId,
        status: "open",
      },
      select: { id: true },
    });
    if (!cart) {
      throw new AppError("NOT_FOUND", "Cart not found");
    }
  }

  return prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: input.cartId,
        productId: input.productId,
      },
    },
    create: {
      tenantId: input.tenantId,
      cartId: input.cartId,
      productId: input.productId,
      quantity: input.quantity,
    },
    update: {
      quantity: input.quantity,
    },
  });
}

/** Batch upsert lines inside an interactive transaction (cart merge). */
export async function upsertCartItemsInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    cartId: string;
    lines: { productId: string; quantity: number }[];
  },
) {
  for (const line of input.lines) {
    await tx.cartItem.upsert({
      where: {
        cartId_productId: {
          cartId: input.cartId,
          productId: line.productId,
        },
      },
      create: {
        tenantId: input.tenantId,
        cartId: input.cartId,
        productId: line.productId,
        quantity: line.quantity,
      },
      update: {
        quantity: line.quantity,
      },
    });
  }
}

export async function touchCart(tenantId: string, cartId: string) {
  return prisma.cart.updateMany({
    where: { id: cartId, tenantId },
    data: { updatedAt: new Date() },
  });
}

export async function updateCartItemQuantity(
  tenantId: string,
  itemId: string,
  quantity: number,
) {
  return prisma.cartItem.updateMany({
    where: { id: itemId, tenantId },
    data: { quantity },
  });
}

export async function deleteCartItem(tenantId: string, itemId: string) {
  return prisma.cartItem.deleteMany({
    where: { id: itemId, tenantId },
  });
}

export async function clearCartItems(tenantId: string, cartId: string) {
  return prisma.cartItem.deleteMany({
    where: { tenantId, cartId },
  });
}

export async function findOpenCartByGuestTokenInTransaction(
  tx: Prisma.TransactionClient,
  tenantId: string,
  guestToken: string,
): Promise<CartWithItems | null> {
  return tx.cart.findFirst({
    where: {
      tenantId,
      guestToken,
      status: "open",
    },
    include: cartInclude,
  });
}

export async function findOpenCheckoutCartInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    customerId?: string | null;
    guestToken?: string | null;
  },
): Promise<CheckoutCartWithItems | null> {
  if (input.customerId) {
    const byCustomer = await tx.cart.findFirst({
      where: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        status: "open",
      },
      include: checkoutCartInclude,
    });
    if (byCustomer) {
      return byCustomer;
    }
  }

  if (input.guestToken) {
    return tx.cart.findFirst({
      where: {
        tenantId: input.tenantId,
        guestToken: input.guestToken,
        status: "open",
      },
      include: checkoutCartInclude,
    });
  }

  return null;
}

/** Lean open-cart load for merge — line productIds/quantities only. */
export async function findOpenCartLinesForMerge(
  tenantId: string,
  input: { guestToken?: string; customerId?: string },
): Promise<{
  id: string;
  customerId: string | null;
  items: { id: string; productId: string; quantity: number }[];
} | null> {
  if (input.customerId) {
    return prisma.cart.findFirst({
      where: { tenantId, customerId: input.customerId, status: "open" },
      select: {
        id: true,
        customerId: true,
        items: {
          select: { id: true, productId: true, quantity: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }
  if (input.guestToken) {
    return prisma.cart.findFirst({
      where: { tenantId, guestToken: input.guestToken, status: "open" },
      select: {
        id: true,
        customerId: true,
        items: {
          select: { id: true, productId: true, quantity: true },
          orderBy: { createdAt: "asc" },
        },
      },
    });
  }
  return null;
}
