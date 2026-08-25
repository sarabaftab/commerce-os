import Link from "next/link";

import {
  getFeaturedStorefrontProducts,
  getStorefrontCategories,
} from "@/modules/catalog";
import { resolveStorefrontTenant } from "@/modules/storefront";
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
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  timer.mark("tenantMs");

  const [categories, featured] = await Promise.all([
    getStorefrontCategories(tenant.id),
    getFeaturedStorefrontProducts(tenant.id, 6),
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
            Premium commerce, simply delivered.
          </h1>
          <p className="max-w-[30ch] text-sm leading-relaxed text-white/70">
            Browse {tenant.name} and checkout in a few taps — built for mobile
            and Telegram.
          </p>
          <Link href={`${basePath}/products`} prefetch={false} className={shop.btnPrimary}>
            Shop products
          </Link>
        </div>
      </section>

      {categories.length > 0 ? (
        <section>
          <SectionHeader title="Categories" href={`${basePath}/products`} />
          <CategoryChips categories={categories} basePath={basePath} />
        </section>
      ) : null}

      <section>
        <SectionHeader title="Featured" href={`${basePath}/products`} />
        <ProductGrid
          products={featured}
          basePath={basePath}
          emptyMessage="No featured products yet. Check back soon."
        />
      </section>
    </div>
  );
}
