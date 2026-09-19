"use client";

import { useLocale } from "@/shared/i18n";
import { shop } from "@/ui/storefront/shop-classes";

type Props = {
  name: string;
  bannerText: string;
  type: string;
};

/**
 * Client island for promotion banner copy only.
 * Receives plain serializable props from the server loader — never imports server services.
 */
export function StorefrontPromotionBannerView({ name, bannerText, type }: Props) {
  const { locale, t } = useLocale();

  const isBogo = type === "buy_one_get_one";
  const title = isBogo && locale === "km" ? t("bogoBadge") : name;
  const showBannerText = !(isBogo && locale === "km");

  return (
    <div
      className="border-b border-[color:var(--shop-line)] bg-[color:var(--shop-surface)]/80"
      role="status"
    >
      <p className={`py-2.5 text-center text-sm text-[color:var(--shop-ink)] ${shop.contentWidth}`}>
        <span className="font-medium">{title}</span>
        {showBannerText ? (
          <span className="text-[color:var(--shop-ink-muted)]"> — {bannerText}</span>
        ) : null}
      </p>
    </div>
  );
}
