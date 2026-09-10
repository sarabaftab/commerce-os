"use client";

import type { ReactNode } from "react";

import {
  StorefrontCheckoutCta,
  useStorefrontCheckoutCtaPadding,
} from "@/ui/storefront/storefront-checkout-cta-bar";
import { shop } from "@/ui/storefront/shop-classes";

type Props = {
  tenantSlug: string;
  children: ReactNode;
};

/** Main content + sticky checkout CTA; padding grows when the CTA is visible. */
export function StorefrontMain({ tenantSlug, children }: Props) {
  const paddingBottom = useStorefrontCheckoutCtaPadding(tenantSlug);

  return (
    <>
      <main className={shop.contentWidth} style={{ paddingBottom }}>
        {children}
      </main>
      <StorefrontCheckoutCta tenantSlug={tenantSlug} />
    </>
  );
}
