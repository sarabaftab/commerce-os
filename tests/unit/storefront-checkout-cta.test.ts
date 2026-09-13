import { describe, expect, it } from "vitest";

import {
  shouldShowStorefrontCheckoutCta,
  STOREFRONT_CHECKOUT_CTA_LABEL,
  storefrontCheckoutCtaHref,
} from "@/ui/storefront/storefront-checkout-cta-helpers";

describe("storefront checkout CTA helpers", () => {
  const slug = "kin-a2";

  it("labels the CTA Proceed to Checkout", () => {
    expect(STOREFRONT_CHECKOUT_CTA_LABEL).toBe("Proceed to Checkout");
  });

  it("routes to the existing Cart page for review before checkout", () => {
    expect(storefrontCheckoutCtaHref(slug)).toBe("/kin-a2/cart");
  });

  it("shows on home and catalog when those routes are browse surfaces", () => {
    expect(shouldShowStorefrontCheckoutCta("/kin-a2", slug)).toBe(true);
    expect(shouldShowStorefrontCheckoutCta("/kin-a2/products", slug)).toBe(true);
  });

  it("hides on cart, checkout, PDP, account, confirmation, and FAQ", () => {
    expect(shouldShowStorefrontCheckoutCta("/kin-a2/cart", slug)).toBe(false);
    expect(shouldShowStorefrontCheckoutCta("/kin-a2/checkout", slug)).toBe(false);
    expect(shouldShowStorefrontCheckoutCta("/kin-a2/products/gold-serum", slug)).toBe(
      false,
    );
    expect(shouldShowStorefrontCheckoutCta("/kin-a2/account", slug)).toBe(false);
    expect(shouldShowStorefrontCheckoutCta("/kin-a2/account/orders/BIL-1", slug)).toBe(
      false,
    );
    expect(
      shouldShowStorefrontCheckoutCta("/kin-a2/orders/BIL-1/confirmation", slug),
    ).toBe(false);
    expect(shouldShowStorefrontCheckoutCta("/kin-a2/faq", slug)).toBe(false);
  });

  it("never shows for a different tenant path or admin", () => {
    expect(shouldShowStorefrontCheckoutCta("/other-shop/products", slug)).toBe(false);
    expect(shouldShowStorefrontCheckoutCta("/admin", slug)).toBe(false);
    expect(shouldShowStorefrontCheckoutCta("/admin/orders", slug)).toBe(false);
  });
});
