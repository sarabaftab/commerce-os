import { notFound } from "next/navigation";

import { getStorefrontProductBySlug } from "@/modules/catalog";
import { AddToCartButton } from "@/modules/orders/components/add-to-cart-button";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { isAppError } from "@/shared/errors/app-error";
import { createTimer } from "@/shared/observability/timing";
import { ProductDetailCopy } from "@/ui/storefront/product-detail-copy";

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

  return (
    <div className="space-y-5 pt-4">
      <ProductDetailCopy
        product={product}
        tenantName={tenant.name}
        backHref={`${basePath}/products${product.category ? `?category=${product.category.slug}` : ""}`}
      />

      <div
        className="sticky bottom-0 -mx-4 border-t border-[color:var(--shop-line)] bg-[color:var(--shop-bg)]/95 px-4 pt-3 backdrop-blur-md sm:-mx-0 sm:rounded-2xl sm:border sm:px-4"
        style={{
          paddingBottom:
            "max(0.75rem, var(--tg-safe-area-inset-bottom, env(safe-area-inset-bottom, 0px)))",
        }}
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
