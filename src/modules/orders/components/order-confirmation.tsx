"use client";

import type { OrderConfirmation } from "@/modules/orders";
import { AbaPaymentDetails } from "@/modules/orders/components/aba-payment-details";
import { AbaProofUpload } from "@/modules/orders/components/aba-proof-upload";
import { formatPackSizeLine, formatPriceTimesQuantity } from "@/modules/catalog/selling-unit";
import { useLocale, type MessageKey } from "@/shared/i18n";
import { formatMoney } from "@/shared/money/money";

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

const STATUS_KEYS: Record<OrderConfirmation["status"], MessageKey> = {
  pending: "statusPending",
  confirmed: "statusConfirmed",
  processing: "statusProcessing",
  ready_for_pickup: "statusReadyForPickup",
  out_for_delivery: "statusOutForDelivery",
  completed: "statusCompleted",
  cancelled: "statusCancelled",
};

export function OrderConfirmationView({
  order,
  tenantSlug,
  accountOrderHref,
  abaPayment,
}: OrderConfirmationViewProps) {
  const { t } = useLocale();

  function formatPaymentMethod(method: OrderConfirmation["paymentMethod"]) {
    return method === "cod" ? t("cashOnDelivery") : t("abaTransferShort");
  }

  function formatFulfillment(current: OrderConfirmation) {
    if (current.fulfillmentMethod === "pickup") {
      return (
        [current.pickupLocationName, current.pickupLocationAddress].filter(Boolean).join(" — ") ||
        t("pickup")
      );
    }
    return [current.addressLine, current.cityOrArea].filter(Boolean).join(", ");
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <p className="text-xs font-medium tracking-[0.14em] text-[color:var(--shop-ink-muted)] uppercase">
          {t("orderConfirmed")}
        </p>
        <h1 className="mt-2 font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          {order.orderNumber}
        </h1>
        <p className="mt-2 text-sm text-[color:var(--shop-ink-muted)]">
          {t("orderPlaced")}
        </p>
        {order.paymentMethod === "aba_transfer" &&
        (order.paymentProofStatus === "awaiting_proof" ||
          order.paymentProofStatus === "submitted") ? (
          <p className="mt-2 text-sm text-[color:var(--shop-ink-muted)]">
            {order.paymentProofStatus === "awaiting_proof"
              ? t("awaitingPaymentProof")
              : t("paymentConfirmationSubmittedBody")}
          </p>
        ) : null}
        <p className="mt-2 text-sm text-[color:var(--shop-ink-muted)]">
          {t("orderStatus")}: {t(STATUS_KEYS[order.status])}
        </p>
        <p className="text-sm text-[color:var(--shop-ink-muted)]">
          {order.placedAt.toLocaleString()}
        </p>
      </div>

      <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <section>
          <h2 className="text-sm font-semibold">{t("contact")}</h2>
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
          <p className="mt-2 text-sm">
            {order.fulfillmentMethod === "pickup" ? t("pickup") : t("delivery")}
          </p>
          <p className="text-sm text-[color:var(--shop-ink-muted)]">{formatFulfillment(order)}</p>
          {order.deliveryInstructions ? (
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              {order.deliveryInstructions}
            </p>
          ) : null}
        </section>

        <section>
          <h2 className="text-sm font-semibold">{t("paymentMethod")}</h2>
          <p className="mt-2 text-sm">{formatPaymentMethod(order.paymentMethod)}</p>
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
              {order.paymentReference}
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
        <h2 className="text-sm font-semibold">{t("orderDetails")}</h2>
        <ul className="space-y-3">
          {order.items.map((item) => (
            <li key={item.id} className="flex items-start justify-between gap-3 text-sm">
              <div>
                <p className="font-medium">{item.name}</p>
                <p className="text-[color:var(--shop-ink-muted)]">
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
              <span className="font-medium">
                {formatMoney(item.lineTotalMinor, order.currency)}
              </span>
            </li>
          ))}
        </ul>

        <div className="space-y-2 border-t border-[color:var(--shop-line)] pt-3 text-sm">
          <div className="flex justify-between">
            <span className="text-[color:var(--shop-ink-muted)]">{t("subtotal")}</span>
            <span>{formatMoney(order.subtotalMinor, order.currency)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-[color:var(--shop-ink-muted)]">{t("deliveryFee")}</span>
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
