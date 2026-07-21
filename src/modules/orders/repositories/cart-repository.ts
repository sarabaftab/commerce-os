import { prisma } from "@/shared/db/prisma";
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
}) {
  return prisma.cartItem.upsert({
    where: {
      cartId_productId: {
        cartId: input.cartId,
        productId: input.productId,
      },
    },
    update: {
      quantity: input.quantity,
    },
    create: {
      tenantId: input.tenantId,
      cartId: input.cartId,
      productId: input.productId,
      quantity: input.quantity,
    },
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

export async function touchCart(cartId: string) {
  return prisma.cart.update({
    where: { id: cartId },
    data: { updatedAt: new Date() },
  });
}
