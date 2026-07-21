import Link from "next/link";
import { notFound } from "next/navigation";

import { getStorefrontProductBySlug } from "@/modules/catalog";
import { AddToCartButton } from "@/modules/orders/components/add-to-cart-button";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { isAppError } from "@/shared/errors/app-error";
import { formatMoney } from "@/shared/money/money";

export const dynamic = "force-dynamic";

type ProductDetailPageProps = {
  params: Promise<{ tenantSlug: string; productSlug: string }>;
};

export default async function StorefrontProductDetailPage({
  params,
}: ProductDetailPageProps) {
  const { tenantSlug, productSlug } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);

  let product;
  try {
    product = await getStorefrontProductBySlug(tenant.id, productSlug);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const imageUrl = product.media[0]?.url;
  const imageAlt = product.media[0]?.alt ?? product.name;

  return (
    <div className="space-y-5 pt-4">
      <Link
        href={`${basePath}/products${product.category ? `?category=${product.category.slug}` : ""}`}
        className="inline-flex text-sm font-medium text-[color:var(--shop-accent)]"
      >
        ← Back to shop
      </Link>

      <div className="overflow-hidden rounded-[1.75rem] bg-white/80 ring-1 ring-[color:var(--shop-line)]">
        <div className="relative aspect-[5/4] bg-[color:var(--shop-surface)]">
          {imageUrl ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={imageUrl} alt={imageAlt} className="h-full w-full object-cover" />
          ) : (
            <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_30%_20%,#d7efe4,transparent_55%),linear-gradient(160deg,#eef6f2,#d9ebe3)] p-6">
              <span className="text-sm text-[color:var(--shop-ink-muted)]">
                {product.category?.name ?? tenant.name}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 p-5">
          {product.category ? (
            <p className="text-[11px] font-medium tracking-[0.16em] text-[color:var(--shop-accent)] uppercase">
              {product.category.name}
            </p>
          ) : null}

          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-shop-display)] text-3xl leading-tight tracking-tight">
              {product.name}
            </h1>
            <p className="text-xl font-semibold">
              {formatMoney(product.priceMinor, product.currency)}
            </p>
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
        <AddToCartButton tenantSlug={tenantSlug} productId={product.id} />
      </div>
    </div>
  );
}
