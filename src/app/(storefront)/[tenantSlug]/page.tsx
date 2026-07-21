import Link from "next/link";

import {
  getFeaturedStorefrontProducts,
  getStorefrontCategories,
} from "@/modules/catalog";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { CategoryChips } from "@/ui/storefront/category-chips";
import { ProductGrid } from "@/ui/storefront/product-grid";
import { SectionHeader } from "@/ui/storefront/section-header";

export const dynamic = "force-dynamic";

type HomePageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StorefrontHomePage({ params }: HomePageProps) {
  const { tenantSlug } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);

  const [categories, featured] = await Promise.all([
    getStorefrontCategories(tenant.id),
    getFeaturedStorefrontProducts(tenant.id, 6),
  ]);

  return (
    <div className="space-y-8 pt-5">
      <section className="relative overflow-hidden rounded-[1.75rem] bg-[color:var(--shop-ink)] px-5 py-8 text-white">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-40"
          style={{
            background:
              "radial-gradient(circle at 85% 15%, rgba(120,200,160,0.45), transparent 40%), linear-gradient(135deg, transparent 40%, rgba(31,107,74,0.5))",
          }}
        />
        <div className="relative space-y-4">
          <p className="text-[11px] font-medium tracking-[0.2em] text-white/70 uppercase">
            {tenant.name}
          </p>
          <h1 className="max-w-[14ch] font-[family-name:var(--font-shop-display)] text-[2.35rem] leading-[1.05] tracking-tight">
            Fresh A2 milk, delivered.
          </h1>
          <p className="max-w-[28ch] text-sm leading-relaxed text-white/75">
            Browse categories and order in a few taps — built for mobile and
            messaging.
          </p>
          <Link
            href={`${basePath}/products`}
            className="inline-flex h-11 items-center justify-center rounded-full bg-white px-5 text-sm font-semibold text-[color:var(--shop-ink)] transition active:scale-[0.98]"
          >
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
