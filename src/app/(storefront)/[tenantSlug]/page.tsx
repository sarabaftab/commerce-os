import Link from "next/link";

import {
  getFeaturedStorefrontProducts,
  getStorefrontCategories,
} from "@/modules/catalog";
import { getActiveStorefrontCampaign } from "@/modules/promotions";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { getRequestLocale } from "@/shared/i18n/get-request-locale";
import { t } from "@/shared/i18n";
import { createTimer } from "@/shared/observability/timing";
import { STOREFRONT_BRAND } from "@/ui/storefront/brand";
import { CategoryChips } from "@/ui/storefront/category-chips";
import { ProductGrid } from "@/ui/storefront/product-grid";
import { SectionHeader } from "@/ui/storefront/section-header";
import { shop } from "@/ui/storefront/shop-classes";

/** Public catalog ISR — aligned with catalog data-cache TTL. */
export const revalidate = 60;

type HomePageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StorefrontHomePage({ params }: HomePageProps) {
  const timer = createTimer("page.storefront.home");
  const { tenantSlug } = await params;
  const locale = await getRequestLocale();
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
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[color:var(--shop-ink)] px-5 py-8 text-[color:var(--shop-surface-elevated)]">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-50"
          style={{
            background:
              "radial-gradient(circle at 88% 12%, rgba(249,220,92,0.55), transparent 42%), linear-gradient(145deg, transparent 35%, rgba(250,229,136,0.25))",
          }}
        />
        <div className="relative space-y-4">
          <p className="text-[11px] font-medium tracking-[0.2em] text-[color:var(--shop-accent-soft)] uppercase">
            {STOREFRONT_BRAND.name}
          </p>
          <h1 className="max-w-[16ch] font-[family-name:var(--font-shop-display)] text-[2.2rem] leading-[1.08] tracking-tight">
            {t(locale, "heroTitle")}
          </h1>
          <p className="max-w-[30ch] text-sm leading-relaxed text-white/70">
            {t(locale, "heroBody")}
          </p>
          <Link href={`${basePath}/products`} prefetch={false} className={shop.btnPrimary}>
            {t(locale, "shopProducts")}
          </Link>
        </div>
      </section>

      {categories.length > 0 ? (
        <section>
          <SectionHeader title={t(locale, "categories")} href={`${basePath}/products`} />
          <CategoryChips categories={categories} basePath={basePath} />
        </section>
      ) : null}

      <section>
        <SectionHeader title={t(locale, "featured")} href={`${basePath}/products`} />
        <ProductGrid
          products={featured}
          basePath={basePath}
          campaign={campaign}
          emptyMessage={t(locale, "noFeaturedProducts")}
        />
      </section>
    </div>
  );
}
