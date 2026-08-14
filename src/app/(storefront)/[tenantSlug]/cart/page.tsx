import Link from "next/link";

import { getCartAction } from "@/modules/orders/actions/cart-actions";
import { CartLineItem } from "@/modules/orders/components/cart-line-item";
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
      <div>
        <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          Your cart
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
          {summary.itemCount} {summary.itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      {summary.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--shop-line)] bg-[color:var(--shop-surface)]/50 px-4 py-12 text-center">
          <p className="text-sm text-[color:var(--shop-ink-muted)]">Your cart is empty.</p>
          <Link
            href={`${basePath}/products`}
            className="mt-4 inline-flex text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
          >
            Browse products
          </Link>
        </div>
      ) : (
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
      )}
    </div>
  );
}
