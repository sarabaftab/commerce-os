import {
  getStorefrontCategories,
  getStorefrontProducts,
} from "@/modules/catalog";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { isAppError } from "@/shared/errors/app-error";
import { createTimer } from "@/shared/observability/timing";
import { CategoryChips } from "@/ui/storefront/category-chips";
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
  try {
    [categories, products] = await Promise.all([
      getStorefrontCategories(tenant.id),
      getStorefrontProducts(tenant.id, {
        categorySlug: categorySlug || undefined,
      }),
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

  const activeCategoryName =
    categories.find((category) => category.slug === categorySlug)?.name ?? null;

  return (
    <div className="space-y-6 pt-5">
      <div>
        <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          {activeCategoryName ?? "All products"}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
          {products.length} {products.length === 1 ? "item" : "items"}
        </p>
      </div>

      <CategoryChips
        categories={categories}
        basePath={basePath}
        activeSlug={categorySlug ?? null}
      />

      <ProductGrid products={products} basePath={basePath} />
    </div>
  );
}
