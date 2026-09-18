import { Suspense, type ReactNode } from "react";

import { LocaleProvider } from "@/shared/i18n";
import { StorefrontAsyncBoundary } from "@/ui/storefront/storefront-chrome";
import { StorefrontPromotionBanner } from "@/ui/storefront/storefront-promotion-banner";
import { StorefrontShellChrome } from "@/ui/storefront/storefront-shell-chrome";

type StorefrontShellProps = {
  tenantSlug: string;
  children: ReactNode;
};

/**
 * Server Component shell: keeps tenant/settings `unstable_cache` loaders on the
 * server, and passes them into client chrome as slots.
 */
export function StorefrontShell({ tenantSlug, children }: StorefrontShellProps) {
  return (
    <LocaleProvider>
      <StorefrontShellChrome
        tenantSlug={tenantSlug}
        headerActions={<StorefrontAsyncBoundary tenantSlug={tenantSlug} slot="header" />}
        footerMeta={<StorefrontAsyncBoundary tenantSlug={tenantSlug} slot="footer" />}
        promotionBanner={
          <Suspense fallback={null}>
            <StorefrontPromotionBanner tenantSlug={tenantSlug} />
          </Suspense>
        }
      >
        {children}
      </StorefrontShellChrome>
    </LocaleProvider>
  );
}
