"use client";

import Link from "next/link";

import type { ProductWithRelations } from "@/modules/catalog/types";
import {
  formatPackSizeLine,
  formatUnitPriceLabel,
} from "@/modules/catalog/selling-unit";
import { localizedValue, useLocale } from "@/shared/i18n";
import { formatMoney } from "@/shared/money/money";
import { ProductImage } from "@/ui/storefront/product-image";

type ProductDetailCopyProps = {
  product: ProductWithRelations;
  tenantName: string;
  backHref: string;
};

export function ProductDetailCopy({ product, tenantName, backHref }: ProductDetailCopyProps) {
  const { locale, t } = useLocale();
  const name = localizedValue({
    locale,
    en: product.name,
    km: product.nameKm,
    zh: product.nameZh,
  });
  const description = localizedValue({
    locale,
    en: product.description ?? "",
    km: product.descriptionKm,
    zh: product.descriptionZh,
  });
  const categoryName = product.category
    ? localizedValue({
        locale,
        en: product.category.name,
        km: product.category.nameKm,
        zh: product.category.nameZh,
      })
    : null;
  const imageUrl = product.media[0]?.url;
  const imageAlt = product.media[0]?.alt ?? name;

  return (
    <>
      <Link
        href={backHref}
        className="inline-flex text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
      >
        ← {t("back")} · {t("shop")}
      </Link>

      <div className="overflow-hidden rounded-[1.75rem] bg-[color:var(--shop-surface-elevated)] ring-1 ring-[color:var(--shop-line)] md:grid md:grid-cols-2 md:items-stretch">
        <div className="relative aspect-[5/4] bg-[color:var(--shop-surface)] md:aspect-auto md:min-h-[22rem]">
          {imageUrl ? (
            <div className="absolute inset-5">
              <ProductImage
                src={imageUrl}
                alt={imageAlt}
                priority
                sizes="(max-width: 768px) 100vw, (max-width: 1024px) 50vw, 512px"
              />
            </div>
          ) : (
            <div className="flex h-full min-h-[16rem] w-full items-end bg-[radial-gradient(circle_at_30%_20%,#fae588,transparent_55%),linear-gradient(160deg,#fffdf4,#fff1b9)] p-6">
              <span className="text-sm text-[color:var(--shop-ink-muted)]">
                {categoryName ?? tenantName}
              </span>
            </div>
          )}
        </div>

        <div className="space-y-4 p-5 md:flex md:flex-col md:justify-center">
          {categoryName ? (
            <p className="text-[11px] font-medium tracking-[0.16em] text-[color:var(--shop-ink-muted)] uppercase">
              {categoryName}
            </p>
          ) : null}

          <div className="space-y-2">
            <h1 className="font-[family-name:var(--font-shop-display)] text-3xl leading-tight tracking-tight break-words">
              {name}
            </h1>
            <p className="text-xl font-semibold">
              {formatUnitPriceLabel(
                formatMoney(product.priceMinor, product.currency),
                product.sellingUnit,
              )}
            </p>
            {formatPackSizeLine(product.volume, product.sellingUnit) ? (
              <p className="text-sm text-[color:var(--shop-ink-muted)]">
                {formatPackSizeLine(product.volume, product.sellingUnit)}
              </p>
            ) : null}
          </div>

          {description ? (
            <p className="text-sm leading-relaxed break-words text-[color:var(--shop-ink-muted)]">
              {description}
            </p>
          ) : null}

          {product.stockNote ? (
            <p className="rounded-xl bg-[color:var(--shop-surface)] px-3 py-2 text-sm text-[color:var(--shop-ink)]">
              {product.stockNote}
            </p>
          ) : null}
        </div>
      </div>
    </>
  );
}
