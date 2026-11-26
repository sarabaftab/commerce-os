import { getCartAction } from "@/modules/orders/actions/cart-actions";
import { CartLineItem } from "@/modules/orders/components/cart-line-item";
import { CartSummaryPanel } from "@/modules/orders/components/cart-summary";
import { ReorderCartBanner } from "@/modules/orders/components/reorder-cart-banner";
import { getActiveStorefrontCampaignMap } from "@/modules/promotions";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { createTimer } from "@/shared/observability/timing";
import {
  LocalizedEmptyState,
  LocalizedPageHeading,
} from "@/ui/storefront/localized-text";

export const dynamic = "force-dynamic";

type CartPageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function StorefrontCartPage({
  params,
  searchParams,
}: CartPageProps) {
  const timer = createTimer("page.storefront.cart");
  const { tenantSlug } = await params;
  const raw = await searchParams;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  timer.mark("tenantMs");
  const summary = await getCartAction(tenantSlug);
  const campaignMap = await getActiveStorefrontCampaignMap(
    tenant.id,
    summary.items.map((line) => line.productId),
  );
  timer.mark("cartMs");
  timer.log({ tenantSlug, itemCount: summary.itemCount });

  const reorderFlag = typeof raw.reorder === "string" ? raw.reorder : null;
  const added = Number.parseInt(String(raw.added ?? "0"), 10) || 0;
  const skipped = Number.parseInt(String(raw.skipped ?? "0"), 10) || 0;

  return (
    <div className="space-y-6 pt-4">
      <LocalizedPageHeading titleKey="yourCart" count={summary.itemCount} />

      {reorderFlag === "1" ? <ReorderCartBanner added={added} skipped={skipped} /> : null}

      {summary.items.length === 0 ? (
        <LocalizedEmptyState
          messageKey="emptyCartTitle"
          actionHref={`${basePath}/products`}
          actionKey="browseProducts"
        />
      ) : (
        <div className="space-y-6">
          <div className="space-y-3">
            {summary.items.map((line) => (
              <CartLineItem
                key={line.id}
                tenantSlug={tenantSlug}
                basePath={basePath}
                line={line}
                campaign={campaignMap.get(line.productId) ?? null}
              />
            ))}
          </div>
          <CartSummaryPanel tenantSlug={tenantSlug} summary={summary} />
        </div>
      )}
    </div>
  );
}
