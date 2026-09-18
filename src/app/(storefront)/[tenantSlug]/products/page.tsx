import {
  getStorefrontCategories,
  getStorefrontProducts,
} from "@/modules/catalog";
import { getActiveStorefrontCampaign } from "@/modules/promotions";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { isAppError } from "@/shared/errors/app-error";
import { createTimer } from "@/shared/observability/timing";
import { CategoryChips } from "@/ui/storefront/category-chips";
import { LocalizedPageHeading, LocalizedText } from "@/ui/storefront/localized-text";
import { ProductGrid } from "@/ui/storefront/product-grid";
import { notFound } from "next/navigation";

/** Public catalog ISR — aligned with catalog data-cache TTL. */
export const revalidate = 60;

type ProductsPageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ category?: string }>;
};

export default async function StorefrontProductsPage({
  params,
  searchParams,
}: ProductsPageProps) {
  const timer = createTimer("page.storefront.products");
  const { tenantSlug } = await params;
  const { category: categorySlug } = await searchParams;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  timer.mark("tenantMs");

  let products;
  let categories;
  let campaign;
  try {
    [categories, products, campaign] = await Promise.all([
      getStorefrontCategories(tenant.id),
      getStorefrontProducts(tenant.id, {
        categorySlug: categorySlug || undefined,
      }),
      getActiveStorefrontCampaign(tenant.id),
    ]);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }
  timer.mark("catalogMs");
  timer.log({
    tenantSlug,
    categorySlug: categorySlug ?? null,
    productCount: products.length,
  });

  const activeCategory = categories.find((category) => category.slug === categorySlug);

  return (
    <div className="space-y-6 pt-5">
      {activeCategory ? (
        <LocalizedPageHeading
          titleEn={activeCategory.name}
          titleKm={activeCategory.nameKm}
          count={products.length}
        />
      ) : (
        <LocalizedPageHeading titleKey="allProducts" count={products.length} />
      )}

      <CategoryChips
        categories={categories}
        basePath={basePath}
        activeSlug={categorySlug ?? null}
      />

      <ProductGrid
        products={products}
        basePath={basePath}
        campaign={campaign}
        emptyMessage={<LocalizedText messageKey="noProducts" />}
      />
    </div>
  );
}
