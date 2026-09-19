"use client";

import Link from "next/link";

import { AbaPaymentDetails } from "@/modules/orders/components/aba-payment-details";
import { AbaProofUpload } from "@/modules/orders/components/aba-proof-upload";
import { BogoCartBanner, BogoLineCallout } from "@/modules/orders/components/bogo-line-callout";
import { CUSTOMER_ORDER_STATUS_MESSAGE_KEYS } from "@/modules/customers/types";
import { useLocale } from "@/shared/i18n";
import { formatMoney } from "@/shared/money/money";
import { formatPackSizeLine, formatPriceTimesQuantity } from "@/modules/catalog/selling-unit";
import { ProductImage } from "@/ui/storefront/product-image";

import type { CustomerOrderDetailDto } from "../types";

type Props = {
  tenantSlug: string;
  order: CustomerOrderDetailDto;
};

export function CustomerOrderDetail({ tenantSlug, order }: Props) {
  const { t } = useLocale();
  const statusKey = CUSTOMER_ORDER_STATUS_MESSAGE_KEYS[order.status];
  const statusLabel = statusKey ? t(statusKey) : order.statusLabel;
  return (
    <div className="space-y-5">
      <div>
        <Link
          href={`/${tenantSlug}/account/orders`}
          className="text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
        >
          ← {t("myOrders")}
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          {order.orderNumber}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
          {order.placedAt.toLocaleString()} · {statusLabel}
        </p>
      </div>

      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
<h2 className="text-sm font-semibold">{t("status")}</h2>
        <ol className="mt-3 space-y-3">
          {order.timeline.map((entry) => (
            <li key={`${entry.status}-${entry.createdAt.toISOString()}`} className="flex gap-3">
              <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-[color:var(--shop-primary)]" />
              <div>
                <p className="text-sm font-medium">
                  {CUSTOMER_ORDER_STATUS_MESSAGE_KEYS[entry.status]
                    ? t(CUSTOMER_ORDER_STATUS_MESSAGE_KEYS[entry.status]!)
                    : entry.statusLabel}
                </p>
                <p className="text-xs text-[color:var(--shop-ink-muted)]">
                  {entry.createdAt.toLocaleString()}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">{t("items")}</h2>
        {order.items.some((item) => item.isBuyOneGetOne || (item.freeQuantity ?? 0) > 0) ? (
          <div className="mt-3">
            <BogoCartBanner />
          </div>
        ) : null}
        <ul className="mt-3 space-y-3">
          {order.items.map((item, index) => {
            const isBogo = Boolean(item.isBuyOneGetOne || (item.freeQuantity ?? 0) > 0);
            const receiveCount =
              item.fulfillmentQuantity ?? item.quantity * (isBogo ? 2 : 1);
            return (
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
                  {isBogo ? (
                    <BogoLineCallout
                      compact
                      paidQuantity={item.quantity}
                      fulfillmentQuantity={receiveCount}
                    />
                  ) : null}
                  {formatPackSizeLine(item.volume, item.sellingUnit) ? (
                    <p className="mt-1 text-xs text-[color:var(--shop-ink-muted)]">
                      {formatPackSizeLine(item.volume, item.sellingUnit)}
                    </p>
                  ) : null}
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-medium">
                    {formatMoney(item.lineTotalMinor, order.currency)}
                  </p>
                  {isBogo ? (
                    <p className="text-[11px] font-medium text-[color:var(--shop-ink-muted)]">
                      {t("bogoPayFor")} {item.quantity}
                    </p>
                  ) : null}
                </div>
              </li>
            );
          })}
        </ul>
      </section>

      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
<h2 className="text-sm font-semibold">{t("pricing")}</h2>
        <dl className="mt-3 space-y-1 text-sm">
          <div className="flex justify-between">
<dt>{t("subtotal")}</dt>
            <dd>{formatMoney(order.subtotalMinor, order.currency)}</dd>
          </div>
          {order.discountMinor > 0 ? (
            <div className="flex justify-between">
<dt>{order.promotionNameSnapshot?.trim() || t("discount")}</dt>
              <dd>-{formatMoney(order.discountMinor, order.currency)}</dd>
            </div>
          ) : null}
          <div className="flex justify-between">
<dt>{t("delivery")}</dt>
            <dd>{formatMoney(order.deliveryFeeMinor, order.currency)}</dd>
          </div>
          <div className="flex justify-between font-semibold">
<dt>{t("total")}</dt>
            <dd>{formatMoney(order.totalMinor, order.currency)}</dd>
          </div>
        </dl>
      </section>

      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">{t("fulfillmentMethod")}</h2>
        <p className="mt-2 text-sm">
          {order.fulfillmentMethod === "pickup" ? t("pickup") : t("delivery")}
        </p>
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
        <h2 className="text-sm font-semibold">{t("payment")}</h2>
        <p className="mt-2 text-sm">
          {order.paymentMethod === "aba_transfer" ? t("abaTransfer") : t("cashOnDelivery")}
        </p>
        {order.paymentMethod === "aba_transfer" ? (
          <>
            <div className="mt-3">
              <AbaPaymentDetails
                qrImageUrl={order.abaQrImageUrl}
                accountName={order.abaAccountName}
                accountNumber={order.abaAccountNumber}
                amountLabel={formatMoney(order.totalMinor, order.currency)}
                instructions={order.abaInstructions}
                customerNote={order.abaCustomerNote}
              />
            </div>
            <div className="mt-3">
              <AbaProofUpload
                tenantSlug={tenantSlug}
                orderNumber={order.orderNumber}
                paymentMethod={order.paymentMethod}
                paymentProofStatus={order.paymentProofStatus}
                paymentProofRejectionReason={order.paymentProofRejectionReason}
              />
            </div>
          </>
        ) : null}
        {order.paymentReference ? (
          <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
            {t("reference")}: {order.paymentReference}
          </p>
        ) : null}
      </section>

      {(order.supportPhone || order.supportEmail) && (
        <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
          <h2 className="text-sm font-semibold">{t("needHelp")}</h2>
          <p className="mt-2 text-sm text-[color:var(--shop-ink-muted)]">
            {t("contactTheStore")}
            {order.supportPhone ? ` at ${order.supportPhone}` : ""}
            {order.supportEmail ? ` · ${order.supportEmail}` : ""}
          </p>
        </section>
      )}
    </div>
  );
}
