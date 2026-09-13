"use client";

import { useLocale } from "@/shared/i18n";

export function FaqPageHeading({ storeName }: { storeName: string }) {
  const { t } = useLocale();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
        {t("faqTitle")}
      </h1>
      <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">{storeName}</p>
    </div>
  );
}
