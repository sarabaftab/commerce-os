import Link from "next/link";

import type { ProductWithRelations } from "@/modules/catalog";
import { formatPackSizeLine, formatUnitPriceLabel } from "@/modules/catalog/selling-unit";
import { formatMoney } from "@/shared/money/money";
import { cn } from "@/ui/lib/utils";
import { ProductImage } from "@/ui/storefront/product-image";
import { shop } from "@/ui/storefront/shop-classes";

type ProductCardProps = {
  product: ProductWithRelations;
  href: string;
  className?: string;
  priority?: boolean;
};

export function ProductCard({ product, href, className, priority = false }: ProductCardProps) {
  const imageUrl = product.media[0]?.url;
  const imageAlt = product.media[0]?.alt ?? product.name;

  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "group flex flex-col overflow-hidden transition duration-200",
        shop.card,
        "active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-[var(--shop-shadow-md)]",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[color:var(--shop-surface)]">
        {imageUrl ? (
          <div className="absolute inset-3">
            <ProductImage
              src={imageUrl}
              alt={imageAlt}
              priority={priority}
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_30%_20%,#fae588,transparent_55%),linear-gradient(160deg,#fffdf4,#fff1b9)] p-4">
            <span className="text-sm font-medium text-[color:var(--shop-ink-muted)]">
              {product.category?.name ?? "Product"}
            </span>
          </div>
        )}
        {!product.isAvailable ? (
          <span className="absolute top-3 left-3 rounded-full bg-[color:var(--shop-ink)]/80 px-2.5 py-1 text-[11px] font-medium tracking-wide text-white uppercase">
            Unavailable
          </span>
        ) : null}
      </div>

      <div className="flex flex-1 flex-col gap-1.5 p-3.5">
        {product.category ? (
          <p className="text-[11px] font-medium tracking-[0.14em] text-[color:var(--shop-ink-muted)] uppercase">
            {product.category.name}
          </p>
        ) : null}
        <h3 className="font-[family-name:var(--font-shop-display)] text-[1.05rem] leading-snug text-[color:var(--shop-ink)]">
          {product.name}
        </h3>
        {product.stockNote ? (
          <p className="line-clamp-1 text-xs text-[color:var(--shop-ink-muted)]">
            {product.stockNote}
          </p>
        ) : null}
        <p className="mt-auto pt-2 text-sm font-semibold text-[color:var(--shop-ink)]">
          {formatUnitPriceLabel(
            formatMoney(product.priceMinor, product.currency),
            product.sellingUnit,
          )}
        </p>
        {formatPackSizeLine(product.volume, product.sellingUnit) ? (
          <p className="text-xs text-[color:var(--shop-ink-muted)]">
            {formatPackSizeLine(product.volume, product.sellingUnit)}
          </p>
        ) : null}
      </div>
    </Link>
  );
}
