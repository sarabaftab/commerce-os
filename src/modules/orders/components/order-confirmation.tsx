"use client";

import type { OrderConfirmation } from "@/modules/orders";
import { AbaPaymentDetails } from "@/modules/orders/components/aba-payment-details";
import { AbaProofUpload } from "@/modules/orders/components/aba-proof-upload";
import { BogoCartBanner, BogoLineCallout } from "@/modules/orders/components/bogo-line-callout";
import { formatPackSizeLine, formatPriceTimesQuantity } from "@/modules/catalog/selling-unit";
import { openStreetMapPinUrl, parseOptionalLatLng } from "@/modules/locations/coordinates";
import { useLocale } from "@/shared/i18n";
import { formatMoney } from "@/shared/money/money";
import {
  CUSTOMER_ORDER_STATUS_MESSAGE_KEYS,
} from "@/modules/customers/types";

type OrderConfirmationViewProps = {
  order: OrderConfirmation;
  tenantSlug: string;
  accountOrderHref: string | null;
  abaPayment: {
    qrImageUrl: string | null;
    accountName: string | null;
    accountNumber: string | null;
    instructions: string | null;
    customerNote: string | null;
  };
};

function formatFulfillment(order: OrderConfirmation, pickupFallback: string) {
  if (order.fulfillmentMethod === "pickup") {
    return (
      [order.pickupLocationName, order.pickupLocationAddress].filter(Boolean).join(" — ") ||
      pickupFallback
    );
  }
  return [order.addressLine, order.cityOrArea].filter(Boolean).join(", ");
}

export function OrderConfirmationView({
  order,
  tenantSlug,
  accountOrderHref,
  abaPayment,
}: OrderConfirmationViewProps) {
  const { t } = useLocale();
  const paymentLabel =
    order.paymentMethod === "cod" ? t("cashOnDelivery") : t("abaTransferShort");
  const statusKey = CUSTOMER_ORDER_STATUS_MESSAGE_KEYS[order.status];
  const statusLabel = statusKey ? t(statusKey) : order.status.replaceAll("_", " ");
  const deliveryPin = parseOptionalLatLng(order.deliveryLatitude, order.deliveryLongitude);
  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <p className="text-xs font-medium tracking-[0.14em] text-[color:var(--shop-ink-muted)] uppercase">
          {t("orderConfirmed")}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          {order.orderNumber}
        </h1>
<p className="mt-2 text-sm text-[color:var(--shop-ink-muted)]">{t("orderPlaced")}</p>
        {order.paymentMethod === "aba_transfer" &&
        (order.paymentProofStatus === "awaiting_proof" ||
          order.paymentProofStatus === "submitted") ? (
          <p className="mt-2 text-sm text-[color:var(--shop-ink-muted)]">
            {order.paymentProofStatus === "awaiting_proof"
              ? t("paymentConfirmationNeededBody")
              : t("paymentConfirmationSubmittedBody")}
          </p>
        ) : null}
        <p className="mt-2 text-sm capitalize text-[color:var(--shop-ink-muted)]">
          {t("status")}: {statusLabel}
        </p>
        <p className="text-sm text-[color:var(--shop-ink-muted)]">
          {order.placedAt.toLocaleString()}
        </p>
      </div>

      <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <section>
<h2 className="text-sm font-semibold">{t("customer")}</h2>
          <p className="mt-2 text-sm">{order.customer.displayName}</p>
          {order.customer.phone ? (
            <p className="text-sm text-[color:var(--shop-ink-muted)]">{order.customer.phone}</p>
          ) : null}
          {order.customer.email ? (
            <p className="text-sm text-[color:var(--shop-ink-muted)]">{order.customer.email}</p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-semibold">{t("fulfillmentMethod")}</h2>
          <p className="mt-2 text-sm">{order.fulfillmentMethod === "pickup" ? t("pickup") : t("delivery")}</p>
          {order.fulfillmentMethod === "delivery" ? (
            <p className="mt-1 text-xs font-medium text-[color:var(--shop-ink-muted)]">
              {t("deliveryAddress")}
            </p>
          ) : null}
          <p className="text-sm text-[color:var(--shop-ink-muted)]">{formatFulfillment(order, t("pickup"))}</p>
          {order.deliveryInstructions ? (
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              {order.deliveryInstructions}
            </p>
          ) : null}
          {deliveryPin ? (
            <p className="mt-2">
              <a
                href={openStreetMapPinUrl(deliveryPin)}
                target="_blank"
                rel="noreferrer"
                className="text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
              >
                {t("viewOnMap")}
              </a>
            </p>
          ) : null}
        </section>

        <section>
<h2 className="text-sm font-semibold">{t("payment")}</h2>
<p className="mt-2 text-sm">{paymentLabel}</p>
          {order.paymentMethod === "aba_transfer" ? (
            <div className="mt-3">
              <AbaPaymentDetails
                qrImageUrl={abaPayment.qrImageUrl}
                accountName={abaPayment.accountName}
                accountNumber={abaPayment.accountNumber}
                amountLabel={formatMoney(order.totalMinor, order.currency)}
                instructions={abaPayment.instructions}
                customerNote={abaPayment.customerNote}
              />
            </div>
          ) : null}
          {order.paymentReference ? (
            <p className="text-sm text-[color:var(--shop-ink-muted)]">
              {t("reference")}: {order.paymentReference}
            </p>
          ) : null}
          <div className="mt-3">
            <AbaProofUpload
              tenantSlug={tenantSlug}
              orderNumber={order.orderNumber}
              paymentMethod={order.paymentMethod}
              paymentProofStatus={order.paymentProofStatus}
              paymentProofRejectionReason={order.paymentProofRejectionReason}
              showLaterNote
            />
          </div>
        </section>
      </div>

      <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">{t("items")}</h2>
        {order.items.some((item) => item.isBuyOneGetOne || (item.freeQuantity ?? 0) > 0) ? (
          <BogoCartBanner />
        ) : null}
        <ul className="space-y-3">
          {order.items.map((item) => {
            const isBogo = item.isBuyOneGetOne || (item.freeQuantity ?? 0) > 0;
            const receiveCount = item.fulfillmentQuantity ?? item.quantity * (isBogo ? 2 : 1);
            return (
              <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
                <div className="min-w-0 flex-1">
                  <p className="font-medium">{item.name}</p>
                  <p className="text-[color:var(--shop-ink-muted)]">
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
                  <span className="font-medium">
                    {formatMoney(item.lineTotalMinor, order.currency)}
                  </span>
                  {isBogo ? (
                    <p className="mt-0.5 text-[11px] font-medium text-[color:var(--shop-ink-muted)]">
                      {t("bogoPayFor")} {item.quantity}
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
            <span>{formatMoney(order.subtotalMinor, order.currency)}</span>
          </div>
          {order.discountMinor > 0 ? (
            <div className="flex justify-between">
              <span className="text-[color:var(--shop-ink-muted)]">
                {order.promotionNameSnapshot?.trim() || t("promotion")}
              </span>
              <span>−{formatMoney(order.discountMinor, order.currency)}</span>
            </div>
          ) : null}
          <div className="flex justify-between">
<span className="text-[color:var(--shop-ink-muted)]">{t("delivery")}</span>
            <span>{formatMoney(order.deliveryFeeMinor, order.currency)}</span>
          </div>
          <div className="flex justify-between font-semibold">
<span>{t("total")}</span>
            <span>{formatMoney(order.totalMinor, order.currency)}</span>
          </div>
        </div>
      </div>

      <div className="flex flex-col gap-2">
        {accountOrderHref ? (
          <a
            href={accountOrderHref}
            className="flex h-11 items-center justify-center rounded-full bg-[color:var(--shop-primary)] text-sm font-semibold text-[color:var(--shop-on-primary)]"
          >
            {t("viewOrder")}
          </a>
        ) : null}
        <a
          href={`/${tenantSlug}`}
          className="flex h-11 items-center justify-center rounded-full ring-1 ring-[color:var(--shop-line)] text-sm font-semibold"
        >
          {t("continueShopping")}
        </a>
      </div>
    </div>
  );
}
