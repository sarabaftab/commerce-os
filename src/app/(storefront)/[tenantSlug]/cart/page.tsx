import Link from "next/link";

import { getCartAction } from "@/modules/orders/actions/cart-actions";
import { CartLineItem } from "@/modules/orders/components/cart-line-item";
import { CartSummaryPanel } from "@/modules/orders/components/cart-summary";
import { resolveStorefrontTenant } from "@/modules/storefront";

export const dynamic = "force-dynamic";

type CartPageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StorefrontCartPage({ params }: CartPageProps) {
  const { tenantSlug } = await params;
  const { basePath } = await resolveStorefrontTenant(tenantSlug);
  const summary = await getCartAction(tenantSlug);

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
        <div className="rounded-2xl border border-dashed border-[color:var(--shop-line)] px-4 py-12 text-center">
          <p className="text-sm text-[color:var(--shop-ink-muted)]">Your cart is empty.</p>
          <Link
            href={`${basePath}/products`}
            className="mt-4 inline-flex text-sm font-medium text-[color:var(--shop-accent)]"
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
