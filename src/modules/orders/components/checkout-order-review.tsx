"use client";

import type { CartSummary } from "@/modules/orders";
import { formatPackSizeLine, formatPriceTimesQuantity } from "@/modules/catalog/selling-unit";
import { computeUnitSalePriceMinor } from "@/modules/promotions/discount";
import { useLocale } from "@/shared/i18n";
import { formatMoney } from "@/shared/money/money";

type CheckoutOrderReviewProps = {
  cart: CartSummary;
  deliveryFeeMinor: number;
  discountMinor?: number;
  promotionName?: string | null;
  promotionType?: "percentage" | "fixed" | null;
  promotionValue?: number | null;
  fulfillmentMethod: "delivery" | "pickup";
  freeDeliveryThresholdMinor?: number | null;
};

export function CheckoutOrderReview({
  cart,
  deliveryFeeMinor,
  discountMinor = 0,
  promotionName,
  promotionType = null,
  promotionValue = null,
  fulfillmentMethod,
  freeDeliveryThresholdMinor,
}: CheckoutOrderReviewProps) {
  const { t } = useLocale();
  const fee = fulfillmentMethod === "delivery" ? deliveryFeeMinor : 0;
  const discount = Math.max(0, discountMinor);
  const totalMinor = cart.subtotalMinor - discount + fee;
  const percentCampaign =
    promotionType === "percentage" &&
    promotionValue != null &&
    promotionValue > 0
      ? { type: "percentage" as const, value: promotionValue }
      : null;

  return (
    <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
      <h2 className="text-sm font-semibold">{t("orderReview")}</h2>

      <ul className="space-y-3">
        {cart.items
          .filter((item) => item.isAvailable)
          .map((item) => {
            const saleUnit =
              percentCampaign != null
                ? computeUnitSalePriceMinor(item.unitPriceMinor, percentCampaign)
                : null;
            const saleLine =
              percentCampaign != null
                ? computeUnitSalePriceMinor(item.lineTotalMinor, percentCampaign)
                : null;

            return (
              <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div>
                  <p className="font-medium">{item.name}</p>
                  <p className="text-[color:var(--shop-ink-muted)]">
                    {formatPriceTimesQuantity(
                      formatMoney(
                        saleUnit ?? item.unitPriceMinor,
                        item.currency,
                      ),
                      item.quantity,
                      item.sellingUnit,
                    )}
                  </p>
                  {saleUnit != null && saleUnit < item.unitPriceMinor ? (
                    <p className="text-xs text-[color:var(--shop-ink-muted)] line-through">
                      {formatMoney(item.unitPriceMinor, item.currency)}
                    </p>
                  ) : null}
                  {formatPackSizeLine(item.volume, item.sellingUnit) ? (
                    <p className="text-xs text-[color:var(--shop-ink-muted)]">
                      {formatPackSizeLine(item.volume, item.sellingUnit)}
                    </p>
                  ) : null}
                </div>
                <div className="text-right">
                  <span className="font-medium">
                    {formatMoney(saleLine ?? item.lineTotalMinor, item.currency)}
                  </span>
                  {saleLine != null && saleLine < item.lineTotalMinor ? (
                    <p className="text-xs text-[color:var(--shop-ink-muted)] line-through">
                      {formatMoney(item.lineTotalMinor, item.currency)}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
      </ul>

      <div className="space-y-2 border-t border-[color:var(--shop-line)] pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[color:var(--shop-ink-muted)]">{t("subtotal")}</span>
          <span>{formatMoney(cart.subtotalMinor, cart.currency)}</span>
        </div>
        {discount > 0 ? (
          <div className="flex justify-between rounded-xl bg-[color:var(--shop-accent-soft)]/70 px-3 py-2 font-semibold text-[color:var(--shop-on-primary)]">
            <span>{promotionName?.trim() || t("promotion")}</span>
            <span>−{formatMoney(discount, cart.currency)}</span>
          </div>
        ) : null}
        {fulfillmentMethod === "delivery" ? (
          <div className="flex justify-between">
            <span className="text-[color:var(--shop-ink-muted)]">
              {freeDeliveryThresholdMinor != null && fee === 0
                ? t("deliveryFree")
                : t("delivery")}
            </span>
            <span>{formatMoney(fee, cart.currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-semibold">
          <span>{t("total")}</span>
          <span>{formatMoney(totalMinor, cart.currency)}</span>
        </div>
      </div>
    </div>
  );
}
