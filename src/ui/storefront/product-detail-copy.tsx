"use client";

import type { ReactNode } from "react";
import Link from "next/link";

import { localizedValue, useLocale } from "@/shared/i18n";

type ProductDetailCopyProps = {
  name: string;
  nameKm?: string | null;
  description?: string | null;
  descriptionKm?: string | null;
  categoryName?: string | null;
  categoryNameKm?: string | null;
  fallbackCategoryLabel?: string;
  stockNote?: string | null;
  children?: ReactNode;
};

export function ProductDetailCopy({
  name,
  nameKm,
  description,
  descriptionKm,
  categoryName,
  categoryNameKm,
  fallbackCategoryLabel,
  stockNote,
  children,
}: ProductDetailCopyProps) {
  const { locale } = useLocale();
  const localizedName = localizedValue({ locale, en: name, km: nameKm });
  const localizedCategory = categoryName
    ? localizedValue({ locale, en: categoryName, km: categoryNameKm })
    : null;
  const localizedDescription = description
    ? localizedValue({ locale, en: description, km: descriptionKm })
    : null;

  return (
    <div className="space-y-4">
      {localizedCategory || fallbackCategoryLabel ? (
        <p className="text-[11px] font-medium tracking-[0.16em] text-[color:var(--shop-ink-muted)] uppercase">
          {localizedCategory ?? fallbackCategoryLabel}
        </p>
      ) : null}

      <div className="space-y-2">
        <h1 className="font-[family-name:var(--font-shop-display)] text-3xl leading-tight tracking-tight break-words">
          {localizedName}
        </h1>
        {children}
      </div>

      {localizedDescription ? (
        <p className="text-sm leading-relaxed break-words text-[color:var(--shop-ink-muted)]">
          {localizedDescription}
        </p>
      ) : null}

      {stockNote ? (
        <p className="rounded-xl bg-[color:var(--shop-surface)] px-3 py-2 text-sm text-[color:var(--shop-ink)]">
          {stockNote}
        </p>
      ) : null}
    </div>
  );
}

export function ProductDetailBackLink({
  href,
}: {
  href: string;
}) {
  const { t } = useLocale();
  return (
    <Link
      href={href}
      prefetch={false}
      className="inline-flex text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
    >
      {t("backToShop")}
    </Link>
  );
}

export function LocalizedPlaceholderLabel({
  categoryName,
  categoryNameKm,
  fallback,
}: {
  categoryName?: string | null;
  categoryNameKm?: string | null;
  fallback: string;
}) {
  const { locale, t } = useLocale();
  const label = categoryName
    ? localizedValue({ locale, en: categoryName, km: categoryNameKm })
    : fallback;
  return (
    <span className="text-sm text-[color:var(--shop-ink-muted)]">{label || t("product")}</span>
  );
}
