"use client";

import Link from "next/link";

import { useLocale } from "@/shared/i18n";

type CartPageHeaderProps = {
  itemCount: number;
  empty: boolean;
  productsHref: string;
};

export function CartPageCopy({ itemCount, empty, productsHref }: CartPageHeaderProps) {
  const { t } = useLocale();

  return (
    <>
      <div>
        <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          {t("yourCart")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
          {itemCount} {t("quantity").toLowerCase()}
        </p>
      </div>
      {empty ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--shop-line)] bg-[color:var(--shop-surface)]/50 px-4 py-12 text-center">
          <p className="text-sm text-[color:var(--shop-ink-muted)]">{t("emptyCartTitle")}</p>
          <p className="mt-1 text-xs text-[color:var(--shop-ink-muted)]">{t("emptyCartBody")}</p>
          <Link
            href={productsHref}
            className="mt-4 inline-flex text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
          >
            {t("continueShopping")}
          </Link>
        </div>
      ) : null}
    </>
  );
}
