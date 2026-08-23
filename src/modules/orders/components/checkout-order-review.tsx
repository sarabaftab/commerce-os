import type { CartSummary } from "@/modules/orders";
import { formatPackSizeLine, formatPriceTimesQuantity } from "@/modules/catalog/selling-unit";
import { formatMoney } from "@/shared/money/money";

type CheckoutOrderReviewProps = {
  cart: CartSummary;
  deliveryFeeMinor: number;
  fulfillmentMethod: "delivery" | "pickup";
  freeDeliveryThresholdMinor?: number | null;
};

export function CheckoutOrderReview({
  cart,
  deliveryFeeMinor,
  fulfillmentMethod,
  freeDeliveryThresholdMinor,
}: CheckoutOrderReviewProps) {
  const fee = fulfillmentMethod === "delivery" ? deliveryFeeMinor : 0;
  const totalMinor = cart.subtotalMinor + fee;

  return (
    <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
      <h2 className="text-sm font-semibold">Order review</h2>

      <ul className="space-y-3">
        {cart.items
          .filter((item) => item.isAvailable)
          .map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-[color:var(--shop-ink-muted)]">
                  {formatPriceTimesQuantity(
                    formatMoney(item.unitPriceMinor, item.currency),
                    item.quantity,
                    item.sellingUnit,
                  )}
                </p>
                {formatPackSizeLine(item.volume, item.sellingUnit) ? (
                  <p className="text-xs text-[color:var(--shop-ink-muted)]">
                    {formatPackSizeLine(item.volume, item.sellingUnit)}
                  </p>
                ) : null}
              </div>
              <span className="font-medium">
                {formatMoney(item.lineTotalMinor, item.currency)}
              </span>
            </li>
          ))}
      </ul>

      <div className="space-y-2 border-t border-[color:var(--shop-line)] pt-3 text-sm">
        <div className="flex justify-between">
          <span className="text-[color:var(--shop-ink-muted)]">Subtotal</span>
          <span>{formatMoney(cart.subtotalMinor, cart.currency)}</span>
        </div>
        {fulfillmentMethod === "delivery" ? (
          <div className="flex justify-between">
            <span className="text-[color:var(--shop-ink-muted)]">
              Delivery
              {freeDeliveryThresholdMinor != null && fee === 0 ? " (free)" : ""}
            </span>
            <span>{formatMoney(fee, cart.currency)}</span>
          </div>
        ) : null}
        <div className="flex justify-between font-semibold">
          <span>Total</span>
          <span>{formatMoney(totalMinor, cart.currency)}</span>
        </div>
      </div>
    </div>
  );
}
