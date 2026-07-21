import Link from "next/link";

import type { ProductWithRelations } from "@/modules/catalog";
import { formatMoney } from "@/shared/money/money";
import { cn } from "@/ui/lib/utils";

type ProductCardProps = {
  product: ProductWithRelations;
  href: string;
  className?: string;
};

export function ProductCard({ product, href, className }: ProductCardProps) {
  const imageUrl = product.media[0]?.url;
  const imageAlt = product.media[0]?.alt ?? product.name;

  return (
    <Link
      href={href}
      className={cn(
        "group flex flex-col overflow-hidden rounded-2xl bg-white/80 shadow-[0_1px_0_rgba(20,36,28,0.06)] ring-1 ring-[color:var(--shop-line)] transition duration-200",
        "active:scale-[0.98] hover:-translate-y-0.5 hover:shadow-md",
        className,
      )}
    >
      <div className="relative aspect-[4/3] overflow-hidden bg-[color:var(--shop-surface)]">
        {imageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={imageUrl}
            alt={imageAlt}
            className="h-full w-full object-cover transition duration-300 group-hover:scale-[1.03]"
          />
        ) : (
          <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_30%_20%,#d7efe4,transparent_55%),linear-gradient(160deg,#eef6f2,#d9ebe3)] p-4">
            <span className="text-sm font-medium text-[color:var(--shop-ink-muted)]">
              {product.category?.name ?? "Fresh"}
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
          <p className="text-[11px] font-medium tracking-[0.14em] text-[color:var(--shop-accent)] uppercase">
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
          {formatMoney(product.priceMinor, product.currency)}
        </p>
      </div>
    </Link>
  );
}
