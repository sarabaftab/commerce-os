"use client";

import { useActionState, useMemo, useState } from "react";

import type { CheckoutPreview } from "@/modules/orders";
import {
  placeOrderAction,
  type PlaceOrderActionState,
} from "@/modules/orders/actions/checkout-actions";
import { formatMoney } from "@/shared/money/money";

import { CheckoutFulfillmentFields } from "./checkout-fulfillment-fields";
import { CheckoutOrderReview } from "./checkout-order-review";
import { CheckoutPaymentFields } from "./checkout-payment-fields";

type CheckoutFormProps = {
  tenantSlug: string;
  preview: CheckoutPreview;
};

const fieldClass =
  "h-11 w-full rounded-xl border border-[color:var(--shop-line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--shop-accent)]";

const initialState: PlaceOrderActionState = {};

export function CheckoutForm({ tenantSlug, preview }: CheckoutFormProps) {
  const initialFulfillment = preview.deliveryEnabled
    ? "delivery"
    : preview.pickupEnabled
      ? "pickup"
      : "delivery";
  const initialPayment = preview.codEnabled
    ? "cod"
    : preview.abaAvailable
      ? "aba_transfer"
      : "cod";

  const [fulfillmentMethod, setFulfillmentMethod] = useState<"delivery" | "pickup">(
    initialFulfillment,
  );
  const [paymentMethod, setPaymentMethod] = useState<"cod" | "aba_transfer">(initialPayment);
  const [state, formAction, pending] = useActionState(
    placeOrderAction.bind(null, tenantSlug),
    initialState,
  );

  const deliveryFeeMinor = fulfillmentMethod === "delivery" ? preview.deliveryFeeMinor : 0;
  const totalMinor = preview.cart.subtotalMinor + deliveryFeeMinor;

  const abaCopy = useMemo(() => {
    const parts = [
      preview.abaAccountName ? `Account: ${preview.abaAccountName}` : null,
      preview.abaAccountNumber ? `Number: ${preview.abaAccountNumber}` : null,
      preview.abaInstructions,
      preview.abaCustomerNote,
    ].filter(Boolean);
    return parts.join("\n");
  }, [preview]);

  return (
    <form action={formAction} className="space-y-4 pb-28">
      <input type="hidden" name="idempotencyKey" value={preview.idempotencyKey} />

      <div className="space-y-4 rounded-2xl bg-white/80 p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">Contact</h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="displayName" className="mb-1 block text-xs font-medium">
              Full name
            </label>
            <input
              id="displayName"
              name="displayName"
              required
              autoComplete="name"
              className={fieldClass}
              placeholder="Your name"
              defaultValue={preview.prefillDisplayName ?? ""}
            />
          </div>
          <div>
            <label htmlFor="phone" className="mb-1 block text-xs font-medium">
              Phone
            </label>
            <input
              id="phone"
              name="phone"
              required
              type="tel"
              autoComplete="tel"
              className={fieldClass}
              placeholder="+855 12 345 678"
            />
          </div>
          <div>
            <label htmlFor="email" className="mb-1 block text-xs font-medium">
              Email{" "}
              <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
            </label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={fieldClass}
              placeholder="you@example.com"
            />
          </div>
        </div>
      </div>

      <CheckoutFulfillmentFields
        fulfillmentMethod={fulfillmentMethod}
        onFulfillmentMethodChange={setFulfillmentMethod}
        pickupLocations={preview.pickupLocations}
        defaultPickupLocationKey={preview.pickupLocations[0]?.id}
        deliveryEnabled={preview.deliveryEnabled}
        pickupEnabled={preview.pickupEnabled}
        deliveryNotes={preview.deliveryNotes}
      />

      <CheckoutPaymentFields
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        codEnabled={preview.codEnabled}
        abaAvailable={preview.abaAvailable}
        abaInstructions={abaCopy}
        abaQrImageUrl={preview.abaQrImageUrl}
      />

      <CheckoutOrderReview
        cart={preview.cart}
        deliveryFeeMinor={preview.deliveryFeeMinor}
        fulfillmentMethod={fulfillmentMethod}
        freeDeliveryThresholdMinor={preview.freeDeliveryThresholdMinor}
      />

      {state.error ? (
        <p className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[color:var(--shop-line)] bg-[color:var(--shop-bg)]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--shop-accent)] text-sm font-semibold text-white disabled:opacity-60"
        >
          {pending
            ? "Placing order…"
            : `Place order · ${formatMoney(totalMinor, preview.cart.currency)}`}
        </button>
      </div>
    </form>
  );
}
