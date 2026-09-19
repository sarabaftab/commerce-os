"use client";

import { useLocale } from "@/shared/i18n";
import { cn } from "@/ui/lib/utils";

type BogoLineCalloutProps = {
  paidQuantity: number;
  fulfillmentQuantity: number;
  className?: string;
  /** Slightly denser layout for tight checkout rows. */
  compact?: boolean;
};

/**
 * High-visibility 1+1 explanation: pay for N, receive 2N.
 * Used on cart, checkout review, and order confirmation.
 */
export function BogoLineCallout({
  paidQuantity,
  fulfillmentQuantity,
  className,
  compact = false,
}: BogoLineCalloutProps) {
  const { t } = useLocale();

  return (
    <div
      className={cn(
        "rounded-xl bg-[color:var(--shop-primary)] px-3 py-2 text-[color:var(--shop-on-primary)]",
        compact ? "mt-1.5" : "mt-2",
        className,
      )}
      role="status"
    >
      <p
        className={cn(
          "font-bold tracking-wide uppercase",
          compact ? "text-[10px]" : "text-[11px]",
        )}
      >
        {t("bogoBadge")}
      </p>
      <p className={cn("font-semibold leading-snug", compact ? "text-sm" : "text-[0.95rem]")}>
        {t("bogoPayFor")} {paidQuantity}
        <span className="mx-1.5 opacity-70" aria-hidden>
          →
        </span>
        {t("bogoYouReceivePrefix")} {fulfillmentQuantity}
      </p>
      <p className={cn("opacity-90", compact ? "text-[11px]" : "text-xs")}>
        {t("bogoPriceOfOne")}
      </p>
    </div>
  );
}

type BogoCartBannerProps = {
  className?: string;
};

/** Cart / checkout summary banner when any line has an active 1+1 offer. */
export function BogoCartBanner({ className }: BogoCartBannerProps) {
  const { t } = useLocale();
  return (
    <div
      className={cn(
        "rounded-2xl bg-[color:var(--shop-accent-soft)] px-4 py-3 text-sm text-[color:var(--shop-ink)] ring-1 ring-[color:var(--shop-primary)]/50",
        className,
      )}
      role="status"
    >
      <p className="font-semibold">{t("bogoBannerTitle")}</p>
      <p className="mt-0.5 text-[color:var(--shop-ink-muted)]">{t("bogoBannerBody")}</p>
    </div>
  );
}
