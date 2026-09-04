import type { ProductWithRelations } from "@/modules/catalog";

import { ProductCard } from "./product-card";

type ProductGridProps = {
  products: ProductWithRelations[];
  basePath: string;
  emptyMessage?: string;
};

export function ProductGrid({
  products,
  basePath,
  emptyMessage = "No products available right now.",
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
        />
      ))}
    </div>
  );
}
