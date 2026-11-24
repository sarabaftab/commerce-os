import { getCartAction } from "@/modules/orders/actions/cart-actions";
import { CartLineItem } from "@/modules/orders/components/cart-line-item";
import { CartSummaryPanel } from "@/modules/orders/components/cart-summary";
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
};

export default async function StorefrontCartPage({ params }: CartPageProps) {
  const timer = createTimer("page.storefront.cart");
  const { tenantSlug } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  timer.mark("tenantMs");
  const summary = await getCartAction(tenantSlug);
  const campaignMap = await getActiveStorefrontCampaignMap(
    tenant.id,
    summary.items.map((line) => line.productId),
  );
  timer.mark("cartMs");
  timer.log({ tenantSlug, itemCount: summary.itemCount });

  return (
    <div className="space-y-6 pt-4">
      <LocalizedPageHeading titleKey="yourCart" count={summary.itemCount} />

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
