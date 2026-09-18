"use client";

import type { SellingUnit } from "@prisma/client";

import { formatUnitPriceLabel } from "@/modules/catalog/selling-unit";
import {
  computeUnitSalePriceMinor,
  type StorefrontCampaignDisplay,
} from "@/modules/promotions/discount";
import { useLocale } from "@/shared/i18n";
import { formatMoney } from "@/shared/money/money";
import { cn } from "@/ui/lib/utils";

type PromotionalPriceProps = {
  priceMinor: number;
  currency: string;
  sellingUnit: SellingUnit;
  campaign?: StorefrontCampaignDisplay | null;
  className?: string;
  /** Larger text for PDP. */
  size?: "sm" | "lg";
};

/** Catalog price with optional percentage sale strikethrough (display-only). */
export function PromotionalPrice({
  priceMinor,
  currency,
  sellingUnit,
  campaign,
  className,
  size = "sm",
}: PromotionalPriceProps) {
  const saleMinor =
    campaign != null ? computeUnitSalePriceMinor(priceMinor, campaign) : null;
  const originalLabel = formatUnitPriceLabel(
    formatMoney(priceMinor, currency),
    sellingUnit,
  );

  if (saleMinor == null || saleMinor >= priceMinor) {
    return (
      <p
        className={cn(
          size === "lg" ? "text-xl font-semibold" : "text-sm font-semibold",
          "text-[color:var(--shop-ink)]",
          className,
        )}
      >
        {originalLabel}
      </p>
    );
  }

  const saleLabel = formatUnitPriceLabel(formatMoney(saleMinor, currency), sellingUnit);

  return (
    <div className={cn("flex flex-wrap items-baseline gap-x-2 gap-y-0.5", className)}>
      <span
        className={cn(
          size === "lg" ? "text-xl" : "text-sm",
          "font-semibold text-[color:var(--shop-ink)]",
        )}
      >
        {saleLabel}
      </span>
      <span
        className={cn(
          size === "lg" ? "text-base" : "text-xs",
          "font-medium text-[color:var(--shop-ink-muted)] line-through decoration-[color:var(--shop-ink-muted)]",
        )}
      >
        {formatMoney(priceMinor, currency)}
      </span>
      {campaign?.type === "percentage" ? (
        <span className="rounded-md bg-[color:var(--shop-accent-soft)] px-1.5 py-0.5 text-[10px] font-semibold tracking-wide text-[color:var(--shop-on-primary)] uppercase">
          −{campaign.value}%
        </span>
      ) : null}
    </div>
  );
}

type SaleBadgeProps = {
  campaign?: StorefrontCampaignDisplay | null;
  className?: string;
};

/** Corner badge when any active campaign is running. */
export function PromotionSaleBadge({ campaign, className }: SaleBadgeProps) {
  const { t } = useLocale();
  if (!campaign) {
    return null;
  }
  const label =
    campaign.type === "percentage" ? `−${campaign.value}%` : t("sale");
  return (
    <span
      className={cn(
        "absolute top-3 right-3 rounded-full bg-[color:var(--shop-primary)] px-2.5 py-1 text-[11px] font-semibold tracking-wide text-[color:var(--shop-on-primary)] shadow-sm",
        className,
      )}
    >
      {label}
    </span>
  );
}
