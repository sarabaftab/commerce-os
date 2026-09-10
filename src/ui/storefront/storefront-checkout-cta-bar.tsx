"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { shop } from "@/ui/storefront/shop-classes";
import { useStorefrontCartItemCount } from "@/ui/storefront/storefront-cart-count";
import {
  shouldShowStorefrontCheckoutCta,
  STOREFRONT_CHECKOUT_CTA_LABEL,
  storefrontCheckoutCtaHref,
} from "@/ui/storefront/storefront-checkout-cta-helpers";

type Props = {
  tenantSlug: string;
};

/**
 * Sticky bottom convenience CTA for browse pages when the cart has items.
 * Links to Cart (existing review → checkout flow). Header cart icon stays.
 */
export function StorefrontCheckoutCta({ tenantSlug }: Props) {
  const pathname = usePathname();
  const itemCount = useStorefrontCartItemCount();
  const visible =
    itemCount > 0 && shouldShowStorefrontCheckoutCta(pathname, tenantSlug);

  if (!visible) {
    return null;
  }

  return (
    <div
      className="pointer-events-none fixed inset-x-0 bottom-0 z-30"
      data-storefront-checkout-cta=""
    >
      <div
        className={`pointer-events-auto ${shop.contentWidth}`}
        style={{
          paddingBottom:
            "max(0.75rem, var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))",
        }}
      >
        <div className="border border-[color:var(--shop-line)] bg-[color:var(--shop-bg)]/95 px-3 py-3 shadow-[var(--shop-shadow-sm)] backdrop-blur-md sm:rounded-2xl">
          <Link
            href={storefrontCheckoutCtaHref(tenantSlug)}
            prefetch={false}
            className={shop.btnPrimaryBlock}
            aria-label={STOREFRONT_CHECKOUT_CTA_LABEL}
          >
            {STOREFRONT_CHECKOUT_CTA_LABEL}
          </Link>
        </div>
      </div>
    </div>
  );
}

/** Extra main padding while the sticky CTA is on-screen so last content stays reachable. */
export function useStorefrontCheckoutCtaPadding(tenantSlug: string): string {
  const pathname = usePathname();
  const itemCount = useStorefrontCartItemCount();
  const visible =
    itemCount > 0 && shouldShowStorefrontCheckoutCta(pathname, tenantSlug);

  if (!visible) {
    return "max(2.5rem, var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))";
  }

  return "max(6.5rem, calc(5.25rem + var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px))))";
}
