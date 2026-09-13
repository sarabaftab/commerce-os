import { getCartAction } from "@/modules/orders/actions/cart-actions";
import { CartLineItem } from "@/modules/orders/components/cart-line-item";
import { CartPageCopy } from "@/modules/orders/components/cart-page-copy";
import { CartSummaryPanel } from "@/modules/orders/components/cart-summary";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { createTimer } from "@/shared/observability/timing";

export const dynamic = "force-dynamic";

type CartPageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StorefrontCartPage({ params }: CartPageProps) {
  const timer = createTimer("page.storefront.cart");
  const { tenantSlug } = await params;
  const { basePath } = await resolveStorefrontTenant(tenantSlug);
  timer.mark("tenantMs");
  const summary = await getCartAction(tenantSlug);
  timer.mark("cartMs");
  timer.log({ tenantSlug, itemCount: summary.itemCount });

  return (
    <div className="space-y-6 pt-4">
      <CartPageCopy
        itemCount={summary.itemCount}
        empty={summary.items.length === 0}
        productsHref={`${basePath}/products`}
      />

      {summary.items.length > 0 ? (
        <div className="space-y-6">
          <div className="space-y-3">
            {summary.items.map((line) => (
              <CartLineItem
                key={line.id}
                tenantSlug={tenantSlug}
                basePath={basePath}
                line={line}
              />
            ))}
          </div>
          <CartSummaryPanel tenantSlug={tenantSlug} summary={summary} />
        </div>
      ) : null}
    </div>
  );
}
