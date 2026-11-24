import {
  getFeaturedStorefrontProducts,
  getStorefrontCategories,
} from "@/modules/catalog";
import {
  getActiveBuyOneGetOneMap,
  getActiveStorefrontCampaignMap,
  type StorefrontCampaignDisplay,
} from "@/modules/promotions";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { createTimer } from "@/shared/observability/timing";
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

function bogoRecordFromMap(
  map: Awaited<ReturnType<typeof getActiveBuyOneGetOneMap>>,
): Record<string, { promotionName: string }> {
  const record: Record<string, { promotionName: string }> = {};
  for (const [productId, entry] of map) {
    record[productId] = { promotionName: entry.promotionName };
  }
  return record;
}

function campaignRecordFromMap(
  map: Map<string, StorefrontCampaignDisplay>,
): Record<string, StorefrontCampaignDisplay> {
  return Object.fromEntries(map);
}

export default async function StorefrontHomePage({ params }: HomePageProps) {
  const timer = createTimer("page.storefront.home");
  const { tenantSlug } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  timer.mark("tenantMs");

  const [categories, featured, bogoMap] = await Promise.all([
    getStorefrontCategories(tenant.id),
    getFeaturedStorefrontProducts(tenant.id, 6),
    getActiveBuyOneGetOneMap(tenant.id),
  ]);
  const campaignMap = await getActiveStorefrontCampaignMap(
    tenant.id,
    featured.map((product) => product.id),
  );
  timer.mark("catalogMs");
  timer.log({ tenantSlug, categoryCount: categories.length, featuredCount: featured.length });

  const bogoByProductId = bogoRecordFromMap(bogoMap);
  const campaignByProductId = campaignRecordFromMap(campaignMap);

  return (
    <div className="space-y-8 pt-5">
      <LocalizedHomeHero />

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
          campaignByProductId={campaignByProductId}
          bogoByProductId={bogoByProductId}
          emptyMessage={<LocalizedText messageKey="noFeaturedProducts" />}
        />
      </section>
    </div>
  );
}
