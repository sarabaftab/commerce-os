import type { ReactNode } from "react";

import type { ProductWithRelations } from "@/modules/catalog";
import type { StorefrontCampaignDisplay } from "@/modules/promotions";

import { ProductCard } from "./product-card";

type ProductGridProps = {
  products: ProductWithRelations[];
  basePath: string;
  emptyMessage?: ReactNode;
  /** @deprecated Prefer campaignByProductId so disjoint product sales all show. */
  campaign?: StorefrontCampaignDisplay | null;
  campaignByProductId?: Record<string, StorefrontCampaignDisplay>;
  bogoByProductId?: Record<string, { promotionName: string }>;
};

export function ProductGrid({
  products,
  basePath,
  emptyMessage = "No products available right now.",
  campaign = null,
  campaignByProductId,
  bogoByProductId,
}: ProductGridProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-2xl border border-dashed border-[color:var(--shop-line)] bg-[color:var(--shop-surface)]/50 px-4 py-12 text-center text-sm text-[color:var(--shop-ink-muted)]">
        {emptyMessage}
      </div>
    );
  }

  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 lg:grid-cols-4 lg:gap-5">
      {products.map((product) => (
        <ProductCard
          key={product.id}
          product={product}
          href={`${basePath}/products/${product.slug}`}
          campaign={campaignByProductId?.[product.id] ?? campaign}
          bogo={bogoByProductId?.[product.id] ?? null}
        />
      ))}
    </div>
  );
}
