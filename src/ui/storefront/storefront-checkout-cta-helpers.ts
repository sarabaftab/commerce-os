/**
 * Pure helpers for the sticky "Proceed to Checkout" storefront CTA.
 * Destination is Cart so customers still review lines / availability before checkout.
 */

export const STOREFRONT_CHECKOUT_CTA_LABEL = "Proceed to Checkout";

/** Cart page already has the primary checkout action with availability checks. */
export function storefrontCheckoutCtaHref(tenantSlug: string): string {
  return `/${tenantSlug}/cart`;
}

/**
 * Browse surfaces only — hide where another primary bottom action exists
 * or checkout is not the right next step.
 */
export function shouldShowStorefrontCheckoutCta(
  pathname: string | null | undefined,
  tenantSlug: string,
): boolean {
  if (!pathname) {
    return false;
  }

  const base = `/${tenantSlug}`;
  if (pathname !== base && !pathname.startsWith(`${base}/`)) {
    return false;
  }

  const rest = pathname === base ? "" : pathname.slice(base.length + 1);
  const segment = rest.split("/")[0] ?? "";

  // Home + catalog browse.
  if (rest === "" || rest === "products") {
    return true;
  }

  // Product detail has its own sticky Add to Cart bar.
  if (segment === "products") {
    return false;
  }

  // Cart / checkout / confirmation / account / FAQ / telegram handoff.
  if (
    segment === "cart" ||
    segment === "checkout" ||
    segment === "orders" ||
    segment === "account" ||
    segment === "faq" ||
    segment === "telegram-session"
  ) {
    return false;
  }

  return false;
}
