import type { CartStatus } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

export type CheckoutIdempotencyIdentity = {
  tenantId: string;
  customerId?: string | null;
  guestToken?: string | null;
};

/**
 * AUD-007: Idempotency replay must belong to the same customer session or
 * the same guest cart that placed the original order.
 */
export function isCustomerBoundIdempotencyReplay(
  identity: CheckoutIdempotencyIdentity,
  orderCustomerId: string,
): boolean {
  return Boolean(identity.customerId && identity.customerId === orderCustomerId);
}

export function isGuestCartBoundIdempotencyReplay(input: {
  guestToken?: string | null;
  orderCustomerId: string;
  convertedCart: {
    status: CartStatus;
    customerId: string | null;
    guestToken: string | null;
  } | null;
}): boolean {
  if (!input.guestToken || !input.convertedCart) {
    return false;
  }
  return (
    input.convertedCart.status === "converted" &&
    input.convertedCart.customerId === input.orderCustomerId &&
    input.convertedCart.guestToken === input.guestToken
  );
}

export async function assertCheckoutIdempotencyReplayAllowed(
  identity: CheckoutIdempotencyIdentity,
  order: { customerId: string },
): Promise<void> {
  if (isCustomerBoundIdempotencyReplay(identity, order.customerId)) {
    return;
  }

  if (identity.guestToken) {
    const convertedCart = await prisma.cart.findFirst({
      where: {
        tenantId: identity.tenantId,
        guestToken: identity.guestToken,
        customerId: order.customerId,
        status: "converted",
      },
      select: {
        status: true,
        customerId: true,
        guestToken: true,
      },
    });

    if (
      isGuestCartBoundIdempotencyReplay({
        guestToken: identity.guestToken,
        orderCustomerId: order.customerId,
        convertedCart,
      })
    ) {
      return;
    }
  }

  // Do not reveal that the idempotency key exists for another caller.
  throw new AppError("NOT_FOUND", "Order not found");
}
