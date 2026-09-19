import { notFound } from "next/navigation";

import { getStorefrontProductBySlug } from "@/modules/catalog";
import { formatPackSizeLine } from "@/modules/catalog/selling-unit";
import { AddToCartButton } from "@/modules/orders/components/add-to-cart-button";
import { isProductPurchasable } from "@/modules/orders/line-promotion";
import {
  getActiveBuyOneGetOneMap,
  getActiveStorefrontCampaign,
} from "@/modules/promotions";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { isAppError } from "@/shared/errors/app-error";
import { createTimer } from "@/shared/observability/timing";
import { LocalizedText } from "@/ui/storefront/localized-text";
import { ProductImage } from "@/ui/storefront/product-image";
import {
  LocalizedPlaceholderLabel,
  ProductDetailBackLink,
  ProductDetailCopy,
} from "@/ui/storefront/product-detail-copy";
import {
  BogoBadge,
  PromotionSaleBadge,
  PromotionalPrice,
} from "@/ui/storefront/promotional-price";

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
  let campaign;
  let bogoMap;
  try {
    [product, campaign, bogoMap] = await Promise.all([
      getStorefrontProductBySlug(tenant.id, productSlug),
      getActiveStorefrontCampaign(tenant.id),
      getActiveBuyOneGetOneMap(tenant.id),
    ]);
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
  const bogo = bogoMap.get(product.id) ?? null;
  const purchasable = isProductPurchasable(
    {
      isAvailable: product.isAvailable,
      stockQuantity: product.stockQuantity,
    },
    bogo,
  );

  return (
    <div className="space-y-5 pt-4">
      <ProductDetailBackLink
        href={`${basePath}/products${product.category ? `?category=${product.category.slug}` : ""}`}
      />

      <div className="overflow-hidden rounded-[1.75rem] bg-[color:var(--shop-surface-elevated)] ring-1 ring-[color:var(--shop-line)] md:grid md:grid-cols-2 md:items-stretch">
        <div className="relative aspect-[5/4] bg-[color:var(--shop-surface)] md:aspect-auto md:min-h-[22rem]">
          {imageUrl ? (
            <div className="absolute inset-5">
              <ProductImage
                src={imageUrl}
                alt={imageAlt}
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 512px"
              />
            </div>
          ) : (
            <div className="flex h-full min-h-[16rem] w-full items-end bg-[radial-gradient(circle_at_30%_20%,#fae588,transparent_55%),linear-gradient(160deg,#fffdf4,#fff1b9)] p-6">
              <LocalizedPlaceholderLabel
                categoryName={product.category?.name}
                categoryNameKm={product.category?.nameKm}
                fallback={tenant.name}
              />
            </div>
          )}
          {purchasable ? (
            bogo ? <BogoBadge /> : <PromotionSaleBadge campaign={campaign} />
          ) : (
            <span className="absolute top-3 left-3 rounded-full bg-[color:var(--shop-ink)]/80 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white uppercase">
              <LocalizedText messageKey="outOfStock" />
            </span>
          )}
        </div>

        <div className="space-y-4 p-5 md:flex md:flex-col md:justify-center">
          <ProductDetailCopy
            name={product.name}
            nameKm={product.nameKm}
            description={product.description}
            descriptionKm={product.descriptionKm}
            categoryName={product.category?.name}
            categoryNameKm={product.category?.nameKm}
            stockNote={product.stockNote}
          >
            <PromotionalPrice
              priceMinor={product.priceMinor}
              currency={product.currency}
              sellingUnit={product.sellingUnit}
              campaign={bogo && purchasable ? null : campaign}
              size="lg"
            />
            {bogo && purchasable ? (
              <LocalizedText
                as="p"
                messageKey="bogoBuyReceive"
                className="text-sm font-medium text-[color:var(--shop-ink-muted)]"
              />
            ) : null}
            {formatPackSizeLine(product.volume, product.sellingUnit) ? (
              <p className="text-sm text-[color:var(--shop-ink-muted)]">
                {formatPackSizeLine(product.volume, product.sellingUnit)}
              </p>
            ) : null}
          </ProductDetailCopy>
        </div>
      </div>

      <div
        className="sticky bottom-0 -mx-4 border-t border-[color:var(--shop-line)] bg-[color:var(--shop-bg)]/95 px-4 pt-3 backdrop-blur-md sm:-mx-0 sm:rounded-2xl sm:border sm:px-4"
        style={{
          paddingBottom:
            "max(0.75rem, var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))",
        }}
      >
        {purchasable ? (
          <AddToCartButton
            tenantSlug={tenantSlug}
            productId={product.id}
            showQuantity
            navigateToCatalogOnSuccess
          />
        ) : (
          <p className="py-3 text-center text-sm font-medium text-[color:var(--shop-ink-muted)]">
            <LocalizedText messageKey="outOfStock" />
          </p>
        )}
      </div>
    </div>
  );
}
