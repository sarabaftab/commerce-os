import { prisma } from "@/shared/db/prisma";

import {
  findOpenCartByCustomerId,
  findOpenCartByGuestToken,
  touchCart,
  upsertCartItem,
} from "../repositories/cart-repository";
import { MAX_CART_QUANTITY } from "../types";

/**
 * Prefer the customer's open cart. Fold guest lines in (sum quantities),
 * then abandon the guest cart. No-op when there is no guest cart.
 */
export async function mergeGuestCartIntoCustomer(input: {
  tenantId: string;
  guestToken: string | null | undefined;
  customerId: string;
}): Promise<void> {
  if (!input.guestToken) {
    return;
  }

  const guestCart = await findOpenCartByGuestToken(input.tenantId, input.guestToken);
  if (!guestCart) {
    return;
  }

  if (guestCart.customerId === input.customerId) {
    return;
  }

  const customerCart = await findOpenCartByCustomerId(input.tenantId, input.customerId);

  if (!customerCart) {
    await prisma.cart.update({
      where: { id: guestCart.id },
      data: {
        customerId: input.customerId,
        guestToken: null,
      },
    });
    await touchCart(guestCart.id);
    return;
  }

  if (customerCart.id === guestCart.id) {
    return;
  }

  for (const item of guestCart.items) {
    const existing = customerCart.items.find((line) => line.productId === item.productId);
    const nextQuantity = Math.min(
      (existing?.quantity ?? 0) + item.quantity,
      MAX_CART_QUANTITY,
    );
    await upsertCartItem({
      tenantId: input.tenantId,
      cartId: customerCart.id,
      productId: item.productId,
      quantity: nextQuantity,
    });
  }

  await prisma.cart.update({
    where: { id: guestCart.id },
    data: {
      status: "abandoned",
      guestToken: null,
    },
  });
  await touchCart(customerCart.id);
}
