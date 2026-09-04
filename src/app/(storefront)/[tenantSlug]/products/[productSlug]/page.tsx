import Link from "next/link";
import { notFound } from "next/navigation";

import { getStorefrontProductBySlug } from "@/modules/catalog";
import {
  formatPackSizeLine,
  formatUnitPriceLabel,
} from "@/modules/catalog/selling-unit";
import { AddToCartButton } from "@/modules/orders/components/add-to-cart-button";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { isAppError } from "@/shared/errors/app-error";
import { formatMoney } from "@/shared/money/money";
import { createTimer } from "@/shared/observability/timing";
import { ProductImage } from "@/ui/storefront/product-image";

/** Public catalog ISR — aligned with catalog data-cache TTL. */
export const revalidate = 60;

type ProductDetailPageProps = {
  params: Promise<{ tenantSlug: string; productSlug: string }>;
};

export default async function StorefrontProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const timer = createTimer("page.storefront.pdp");
  const { tenantSlug, productSlug } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  timer.mark("tenantMs");

  let product;
  try {
    product = await getStorefrontProductBySlug(tenant.id, productSlug);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
  timer.mark("productMs");
  timer.log({ tenantSlug, productSlug });

  const imageUrl = product.media[0]?.url;
  const imageAlt = product.media[0]?.alt ?? product.name;

  return (
    <div className="space-y-5 pt-4">
      <Link
        href={`${basePath}/products${product.category ? `?category=${product.category.slug}` : ""}`}
        className="inline-flex text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
      >
        ← Back to shop
      </Link>

      <div className="overflow-hidden rounded-[1.75rem] bg-[color:var(--shop-surface-elevated)] ring-1 ring-[color:var(--shop-line)]">
        <div className="relative aspect-[5/4] bg-[color:var(--shop-surface)]">
          {imageUrl ? (
            <div className="absolute inset-5">
              <ProductImage
                src={imageUrl}
                alt={imageAlt}
                priority
                sizes="(max-width: 512px) 100vw, 512px"
              />
            </div>
          ) : (
            <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_30%_20%,#fae588,transparent_55%),linear-gradient(160deg,#fffdf4,#fff1b9)] p-6">
              <span className="text-sm text-[color:var(--shop-ink-muted)]">
                {product.category?.name ?? tenant.name}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 p-5">
          {product.category ? (
            <p className="text-[11px] font-medium tracking-[0.16em] text-[color:var(--shop-ink-muted)] uppercase">
              {product.category.name}
            </p>
          ) : null}

          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-shop-display)] text-3xl leading-tight tracking-tight">
              {product.name}
            </h1>
            <p className="text-xl font-semibold">
              {formatUnitPriceLabel(
                formatMoney(product.priceMinor, product.currency),
                product.sellingUnit,
              )}
            </p>
            {formatPackSizeLine(product.volume, product.sellingUnit) ? (
              <p className="text-sm text-[color:var(--shop-ink-muted)]">
                {formatPackSizeLine(product.volume, product.sellingUnit)}
              </p>
            ) : null}
          </div>

          {product.description ? (
            <p className="text-sm leading-relaxed text-[color:var(--shop-ink-muted)]">
              {product.description}
            </p>
          ) : null}

          {product.stockNote ? (
            <p className="rounded-xl bg-[color:var(--shop-surface)] px-3 py-2 text-sm text-[color:var(--shop-ink)]">
              {product.stockNote}
            </p>
          ) : null}
        </div>
      </div>

      <div
        className="sticky bottom-0 -mx-4 border-t border-[color:var(--shop-line)] bg-[color:var(--shop-bg)]/95 px-4 pt-3 backdrop-blur-md"
        style={{ paddingBottom: "max(0.75rem, env(safe-area-inset-bottom))" }}
      >
        <AddToCartButton
          tenantSlug={tenantSlug}
          productId={product.id}
          showQuantity
          navigateToCatalogOnSuccess
        />
      </div>
    </div>
  );
}
