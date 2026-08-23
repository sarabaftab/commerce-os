import { Prisma } from "@prisma/client";

import { findProductAvailability } from "@/modules/catalog/repositories/product-repository";
import { AppError } from "@/shared/errors/app-error";
import { createGuestToken } from "@/shared/cart/cart-cookie";

import {
  clearCartItems,
  createCustomerCart,
  createGuestCart,
  deleteCartItem,
  findCartById,
  findCartItemById,
  findOpenCartByCustomerId,
  findOpenCartByGuestToken,
  sumOpenCartItemQuantities,
  touchCart,
  upsertCartItem,
  updateCartItemQuantity,
} from "../repositories/cart-repository";
import { addCartItemSchema } from "../schemas/cart";
import type { CartSummary, CartWithItems } from "../types";
import { MAX_CART_QUANTITY } from "../types";

export type CartIdentity = {
  tenantId: string;
  guestToken?: string | null;
  customerId?: string | null;
};

function assertCartLineOwnedByIdentity(
  identity: CartIdentity,
  cart: { customerId: string | null; guestToken: string | null },
) {
  if (identity.customerId) {
    if (cart.customerId === identity.customerId) {
      return;
    }
    // Allow mutating a guest cart that has not yet been associated.
    if (!cart.customerId && identity.guestToken && cart.guestToken === identity.guestToken) {
      return;
    }
    throw new AppError("NOT_FOUND", "Cart item not found");
  }

  if (identity.guestToken && cart.guestToken === identity.guestToken) {
    return;
  }

  throw new AppError("NOT_FOUND", "Cart item not found");
}

function buildCartSummary(cart: CartWithItems, tenantCurrency: string): CartSummary {
  const items = cart.items
    .filter((item) => item.product && !item.product.deletedAt)
    .map((item) => {
      const available = item.product.isAvailable;
      const unitPriceMinor = item.product.priceMinor;
      const lineTotalMinor = available ? unitPriceMinor * item.quantity : 0;

      return {
        id: item.id,
        productId: item.productId,
        slug: item.product.slug,
        name: item.product.name,
        quantity: item.quantity,
        unitPriceMinor,
        lineTotalMinor,
        currency: item.product.currency,
        imageUrl: item.product.media[0]?.url ?? null,
        isAvailable: available,
        volume: item.product.volume,
        sellingUnit: item.product.sellingUnit,
      };
    });

  const availableItems = items.filter((item) => item.isAvailable);
  const itemCount = availableItems.reduce((sum, item) => sum + item.quantity, 0);
  const subtotalMinor = availableItems.reduce((sum, item) => sum + item.lineTotalMinor, 0);
  const currency =
    availableItems[0]?.currency ?? cart.items[0]?.product.currency ?? tenantCurrency;

  return {
    id: cart.id,
    itemCount,
    currency,
    subtotalMinor,
    items,
  };
}

async function createOpenGuestCart(tenantId: string, preferredToken?: string | null) {
  if (preferredToken) {
    try {
      const cart = await createGuestCart(tenantId, preferredToken);
      // Cookie already has this token.
      return { cart, guestToken: undefined as string | undefined };
    } catch (error) {
      // Cookie still points at a converted/abandoned cart — rotate token.
      if (
        error instanceof Prisma.PrismaClientKnownRequestError &&
        error.code === "P2002"
      ) {
        const rotatedToken = createGuestToken();
        const cart = await createGuestCart(tenantId, rotatedToken);
        return { cart, guestToken: rotatedToken };
      }
      throw error;
    }
  }

  const guestToken = createGuestToken();
  const cart = await createGuestCart(tenantId, guestToken);
  return { cart, guestToken };
}

export async function getOrCreateCart(
  identity: CartIdentity,
  tenantCurrency: string,
): Promise<{ summary: CartSummary; cart: CartWithItems; guestToken?: string }> {
  let cart: CartWithItems | null = null;
  let newGuestToken: string | undefined;

  if (identity.customerId) {
    cart = await findOpenCartByCustomerId(identity.tenantId, identity.customerId);
  }

  if (!cart && identity.guestToken) {
    cart = await findOpenCartByGuestToken(identity.tenantId, identity.guestToken);
  }

  if (!cart && identity.customerId) {
    cart = await createCustomerCart(identity.tenantId, identity.customerId);
  }

  if (!cart) {
    const created = await createOpenGuestCart(identity.tenantId, identity.guestToken);
    cart = created.cart;
    newGuestToken = created.guestToken;
  }

  return {
    summary: buildCartSummary(cart, tenantCurrency),
    cart,
    guestToken: newGuestToken,
  };
}

export async function getCartSummary(
  identity: CartIdentity,
  tenantCurrency: string,
): Promise<CartSummary | null> {
  let cart: CartWithItems | null = null;

  if (identity.customerId) {
    cart = await findOpenCartByCustomerId(identity.tenantId, identity.customerId);
  }

  if (!cart && identity.guestToken) {
    cart = await findOpenCartByGuestToken(identity.tenantId, identity.guestToken);
  }

  if (!cart) {
    return null;
  }

  return buildCartSummary(cart, tenantCurrency);
}

/** Header badge only — avoids loading product/media graphs on every page. */
export async function getCartItemCount(identity: CartIdentity): Promise<number> {
  if (!identity.customerId && !identity.guestToken) {
    return 0;
  }
  return sumOpenCartItemQuantities({
    tenantId: identity.tenantId,
    customerId: identity.customerId,
    guestToken: identity.guestToken,
  });
}

async function assertProductCanBeAdded(tenantId: string, productId: string) {
  const product = await findProductAvailability(tenantId, productId);
  if (!product || product.deletedAt) {
    throw new AppError("NOT_FOUND", "Product not found");
  }
  if (!product.isAvailable) {
    throw new AppError("VALIDATION", "Product is not available");
  }
  return product;
}

export async function addItemToCart(
  identity: CartIdentity,
  tenantCurrency: string,
  input: { productId: string; quantity: number },
): Promise<{ summary: CartSummary; guestToken?: string }> {
  const parsed = addCartItemSchema.parse(input);
  const [, openCart] = await Promise.all([
    assertProductCanBeAdded(identity.tenantId, parsed.productId),
    getOrCreateCart(identity, tenantCurrency),
  ]);

  const cart = openCart.cart;
  const existing = cart.items.find((item) => item.productId === parsed.productId);
  const nextQuantity = Math.min(
    (existing?.quantity ?? 0) + parsed.quantity,
    MAX_CART_QUANTITY,
  );

  await Promise.all([
    upsertCartItem({
      tenantId: identity.tenantId,
      cartId: cart.id,
      productId: parsed.productId,
      quantity: nextQuantity,
      skipCartCheck: true,
    }),
    touchCart(identity.tenantId, cart.id),
  ]);

  const refreshed = await findCartById(identity.tenantId, cart.id);
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "Cart not found");
  }

  return {
    summary: buildCartSummary(refreshed, tenantCurrency),
    guestToken: openCart.guestToken,
  };
}

export async function updateCartItemQty(
  identity: CartIdentity,
  tenantCurrency: string,
  itemId: string,
  quantity: number,
): Promise<{ summary: CartSummary; guestToken?: string }> {
  const line = await findCartItemById(identity.tenantId, itemId);
  if (!line || line.cart.status !== "open") {
    throw new AppError("NOT_FOUND", "Cart item not found");
  }
  assertCartLineOwnedByIdentity(identity, line.cart);

  await assertProductCanBeAdded(identity.tenantId, line.productId);

  const [result] = await Promise.all([
    updateCartItemQuantity(identity.tenantId, itemId, quantity),
    touchCart(identity.tenantId, line.cartId),
  ]);
  if (result.count === 0) {
    throw new AppError("NOT_FOUND", "Cart item not found");
  }

  const refreshed = await findCartById(identity.tenantId, line.cartId);
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "Cart not found");
  }

  return {
    summary: buildCartSummary(refreshed, tenantCurrency),
    guestToken: undefined,
  };
}

export async function removeCartItem(
  identity: CartIdentity,
  tenantCurrency: string,
  itemId: string,
): Promise<{ summary: CartSummary; guestToken?: string }> {
  const line = await findCartItemById(identity.tenantId, itemId);
  if (!line || line.cart.status !== "open") {
    throw new AppError("NOT_FOUND", "Cart item not found");
  }
  assertCartLineOwnedByIdentity(identity, line.cart);

  await Promise.all([
    deleteCartItem(identity.tenantId, itemId),
    touchCart(identity.tenantId, line.cartId),
  ]);

  const refreshed = await findCartById(identity.tenantId, line.cartId);
  if (!refreshed) {
    throw new AppError("NOT_FOUND", "Cart not found");
  }

  return {
    summary: buildCartSummary(refreshed, tenantCurrency),
    guestToken: undefined,
  };
}

export async function clearCart(
  identity: CartIdentity,
  tenantCurrency: string,
): Promise<{ summary: CartSummary; guestToken?: string }> {
  const { cart, guestToken } = await getOrCreateCart(identity, tenantCurrency);
  await Promise.all([
    clearCartItems(identity.tenantId, cart.id),
    touchCart(identity.tenantId, cart.id),
  ]);

  return {
    summary: buildCartSummary({ ...cart, items: [] }, tenantCurrency),
    guestToken,
  };
}
