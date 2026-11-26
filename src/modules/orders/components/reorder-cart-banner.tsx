"use client";

import { useLocale } from "@/shared/i18n";

type ReorderCartBannerProps = {
  added: number;
  skipped: number;
};

export function ReorderCartBanner({ added, skipped }: ReorderCartBannerProps) {
  const { t } = useLocale();

  if (added <= 0 && skipped <= 0) {
    return null;
  }

  return (
    <div className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 text-sm ring-1 ring-[color:var(--shop-line)]">
      <p className="font-medium text-[color:var(--shop-ink)]">{t("reorderCartReady")}</p>
      <p className="mt-1 text-[color:var(--shop-ink-muted)]">
        {skipped > 0
          ? t("reorderCartPartial")
              .replace("{added}", String(added))
              .replace("{skipped}", String(skipped))
          : t("reorderCartAllAdded").replace("{added}", String(added))}
      </p>
      <p className="mt-2 text-[color:var(--shop-ink-muted)]">{t("reorderCartReviewHint")}</p>
    </div>
  );
}
