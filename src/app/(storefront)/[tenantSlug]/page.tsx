import {
  getFeaturedStorefrontProducts,
  getStorefrontCategories,
} from "@/modules/catalog";
import { getActiveStorefrontCampaign } from "@/modules/promotions";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { createTimer } from "@/shared/observability/timing";
import { STOREFRONT_BRAND } from "@/ui/storefront/brand";
import { CategoryChips } from "@/ui/storefront/category-chips";
import {
  LocalizedHomeHero,
  LocalizedSectionHeader,
  LocalizedText,
} from "@/ui/storefront/localized-text";
import { ProductGrid } from "@/ui/storefront/product-grid";

/** Public catalog ISR — aligned with catalog data-cache TTL. */
export const revalidate = 60;

type HomePageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StorefrontHomePage({ params }: HomePageProps) {
  const timer = createTimer("page.storefront.home");
  const { tenantSlug } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  timer.mark("tenantMs");

  const [categories, featured, campaign] = await Promise.all([
    getStorefrontCategories(tenant.id),
    getFeaturedStorefrontProducts(tenant.id, 6),
    getActiveStorefrontCampaign(tenant.id),
  ]);
  timer.mark("catalogMs");
  timer.log({ tenantSlug, categoryCount: categories.length, featuredCount: featured.length });

  return (
    <div className="space-y-8 pt-5">
      <LocalizedHomeHero brandName={STOREFRONT_BRAND.name} productsHref={`${basePath}/products`} />

      {categories.length > 0 ? (
        <section>
          <LocalizedSectionHeader titleKey="categories" href={`${basePath}/products`} />
          <CategoryChips categories={categories} basePath={basePath} />
        </section>
      ) : null}

      <section>
        <LocalizedSectionHeader titleKey="featured" href={`${basePath}/products`} />
        <ProductGrid
          products={featured}
          basePath={basePath}
          campaign={campaign}
          emptyMessage={<LocalizedText messageKey="noFeaturedProducts" />}
        />
      </section>
    </div>
  );
}
