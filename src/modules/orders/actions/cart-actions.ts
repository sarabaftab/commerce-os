"use server";

import { revalidatePath } from "next/cache";
import { cookies } from "next/headers";

import { getTenantBySlug } from "@/modules/identity";
import {
  addItemToCart,
  clearCart,
  getCartSummary,
  getOrCreateCart,
  removeCartItem,
  updateCartItemQty,
} from "@/modules/orders";
import { readGuestTokenFromCookies } from "@/shared/cart/cart-cookie";
import type { CartSummary } from "@/modules/orders";

const EMPTY_CART = (currency: string): CartSummary => ({
  id: "",
  itemCount: 0,
  currency,
  subtotalMinor: 0,
  items: [],
});

async function resolveTenantAndIdentity(tenantSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  const guestToken = await readGuestTokenFromCookies();
  return {
    tenant,
    identity: {
      tenantId: tenant.id,
      guestToken,
      customerId: null as string | null,
    },
  };
}

async function setGuestCookieIfNeeded(guestToken?: string) {
  if (!guestToken) {
    return;
  }
  const cookieStore = await cookies();
  cookieStore.set("commerceos_cart", guestToken, {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 30,
    secure: process.env.NODE_ENV === "production",
  });
}

/** Read-only — safe from Server Components / layouts (does not write cookies). */
export async function getCartAction(tenantSlug: string): Promise<CartSummary> {
  const { tenant, identity } = await resolveTenantAndIdentity(tenantSlug);
  const summary = await getCartSummary(identity, tenant.currency);
  return summary ?? EMPTY_CART(tenant.currency);
}

export async function addToCartAction(
  tenantSlug: string,
  productId: string,
  quantity = 1,
) {
  const { tenant, identity } = await resolveTenantAndIdentity(tenantSlug);
  const result = await addItemToCart(identity, tenant.currency, { productId, quantity });
  await setGuestCookieIfNeeded(result.guestToken);
  revalidatePath(`/${tenantSlug}/cart`);
  revalidatePath(`/${tenantSlug}`, "layout");
  return result.summary;
}

export async function updateCartItemAction(
  tenantSlug: string,
  itemId: string,
  quantity: number,
) {
  const { tenant, identity } = await resolveTenantAndIdentity(tenantSlug);
  const result = await updateCartItemQty(identity, tenant.currency, itemId, quantity);
  revalidatePath(`/${tenantSlug}/cart`);
  revalidatePath(`/${tenantSlug}`, "layout");
  return result.summary;
}

export async function removeCartItemAction(tenantSlug: string, itemId: string) {
  const { tenant, identity } = await resolveTenantAndIdentity(tenantSlug);
  const result = await removeCartItem(identity, tenant.currency, itemId);
  revalidatePath(`/${tenantSlug}/cart`);
  revalidatePath(`/${tenantSlug}`, "layout");
  return result.summary;
}

export async function clearCartAction(tenantSlug: string) {
  const { tenant, identity } = await resolveTenantAndIdentity(tenantSlug);
  // If no guest cookie yet, nothing to clear.
  if (!identity.guestToken && !identity.customerId) {
    return EMPTY_CART(tenant.currency);
  }
  const result = await clearCart(identity, tenant.currency);
  await setGuestCookieIfNeeded(result.guestToken);
  revalidatePath(`/${tenantSlug}/cart`);
  revalidatePath(`/${tenantSlug}`, "layout");
  return result.summary;
}
