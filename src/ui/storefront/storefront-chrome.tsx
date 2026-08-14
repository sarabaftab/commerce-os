import { Suspense } from "react";

import { getStorefrontSettings } from "@/modules/settings";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { StorefrontHeaderChrome } from "@/ui/storefront/storefront-header-chrome";

type Props = {
  tenantSlug: string;
};

/** Client cart/account chrome — no server cookies in the public layout tree. */
export function StorefrontHeaderActions({ tenantSlug }: Props) {
  return <StorefrontHeaderChrome tenantSlug={tenantSlug} />;
}

export function StorefrontHeaderActionsFallback() {
  return (
    <>
      <span className="inline-flex size-10" aria-hidden />
    </>
  );
}

/** Cached settings only — safe for ISR public shell. */
export async function StorefrontFooterMeta({ tenantSlug }: Props) {
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const settings = await getStorefrontSettings(tenant.id, tenant.slug);
  const parts = [settings.displayName, settings.phone].filter(Boolean);
  if (parts.length === 0) {
    return null;
  }
  return (
    <p className="text-[11px] text-[color:var(--shop-ink-muted)]">{parts.join(" · ")}</p>
  );
}

export function StorefrontAsyncBoundary({
  tenantSlug,
  slot,
}: {
  tenantSlug: string;
  slot: "header" | "footer";
}) {
  if (slot === "header") {
    return <StorefrontHeaderActions tenantSlug={tenantSlug} />;
  }
  return (
    <Suspense fallback={null}>
      <StorefrontFooterMeta tenantSlug={tenantSlug} />
    </Suspense>
  );
}
