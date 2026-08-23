import Link from "next/link";

import { formatMoney } from "@/shared/money/money";
import { formatPackSizeLine, formatPriceTimesQuantity } from "@/modules/catalog/selling-unit";
import { ProductImage } from "@/ui/storefront/product-image";

import type { CustomerOrderDetailDto } from "../types";

type Props = {
  tenantSlug: string;
  order: CustomerOrderDetailDto;
};

export function CustomerOrderDetail({ tenantSlug, order }: Props) {
  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/${tenantSlug}/account/orders`}
          className="text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
        >
          ← My orders
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          {order.orderNumber}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
          {order.placedAt.toLocaleString()} · {order.statusLabel}
        </p>
      </div>

      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">Status</h2>
        <ol className="mt-3 space-y-3">
          {order.timeline.map((entry) => (
            <li key={`${entry.status}-${entry.createdAt.toISOString()}`} className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--shop-primary)]" />
              <div>
                <p className="text-sm font-medium">{entry.statusLabel}</p>
                <p className="text-xs text-[color:var(--shop-ink-muted)]">
                  {entry.createdAt.toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">Items</h2>
        <ul className="mt-3 space-y-3">
          {order.items.map((item, index) => (
            <li key={`${item.name}-${index}`} className="flex gap-3">
              {item.imageUrl ? (
                <div className="relative h-12 w-12 shrink-0 overflow-hidden rounded-lg">
                  <ProductImage src={item.imageUrl} alt="" sizes="48px" className="h-full w-full" />
                </div>
              ) : (
                <div className="h-12 w-12 rounded-lg bg-[color:var(--shop-line)]/40" />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium">{item.name}</p>
                <p className="text-xs text-[color:var(--shop-ink-muted)]">
                  {formatPriceTimesQuantity(
                    formatMoney(item.unitPriceMinor, order.currency),
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
              <p className="text-sm font-medium">
                {formatMoney(item.lineTotalMinor, order.currency)}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">Pricing</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
            <dt>Subtotal</dt>
            <dd>{formatMoney(order.subtotalMinor, order.currency)}</dd>
          </div>
          {order.discountMinor > 0 ? (
            <div className="flex justify-between">
              <dt>Discount</dt>
              <dd>-{formatMoney(order.discountMinor, order.currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
            <dt>Delivery</dt>
            <dd>{formatMoney(order.deliveryFeeMinor, order.currency)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
            <dt>Total</dt>
            <dd>{formatMoney(order.totalMinor, order.currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">Fulfillment</h2>
        <p className="mt-2 text-sm capitalize">{order.fulfillmentMethod.replaceAll("_", " ")}</p>
        {order.delivery ? (
          <div className="mt-2 space-y-1 text-sm text-[color:var(--shop-ink-muted)]">
            {order.delivery.label ? <p>{order.delivery.label}</p> : null}
            {order.delivery.recipientName ? <p>{order.delivery.recipientName}</p> : null}
            {order.delivery.phone ? <p>{order.delivery.phone}</p> : null}
            <p>
              {[
                order.delivery.addressLine1,
                order.delivery.addressLine2,
                order.delivery.cityOrArea,
                order.delivery.provinceOrState,
                order.delivery.postalCode,
                order.delivery.countryCode,
              ]
                .filter(Boolean)
                .join(", ")}
            </p>
            {order.delivery.deliveryInstructions ? (
              <p>{order.delivery.deliveryInstructions}</p>
            ) : null}
          </div>
        ) : null}
        {order.pickup ? (
          <div className="mt-2 space-y-1 text-sm text-[color:var(--shop-ink-muted)]">
            {order.pickup.name ? <p>{order.pickup.name}</p> : null}
            {order.pickup.address ? <p>{order.pickup.address}</p> : null}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">Payment</h2>
        <p className="mt-2 text-sm capitalize">{order.paymentMethod.replaceAll("_", " ")}</p>
        {order.paymentReference ? (
          <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
            Reference: {order.paymentReference}
          </p>
        ) : null}
      </section>

      {(order.supportPhone || order.supportEmail) && (
        <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
          <h2 className="text-sm font-semibold">Need help?</h2>
          <p className="mt-2 text-sm text-[color:var(--shop-ink-muted)]">
            Contact the store
            {order.supportPhone ? ` at ${order.supportPhone}` : ""}
            {order.supportEmail ? ` · ${order.supportEmail}` : ""}
          </p>
        </section>
      )}
    </div>
  );
}
