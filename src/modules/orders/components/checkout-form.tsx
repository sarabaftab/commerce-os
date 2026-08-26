"use client";

import { useActionState, useMemo, useState } from "react";

import { FieldLabel } from "@/ui/components/field-label";
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
  "h-11 w-full rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] px-3 text-sm outline-none focus:border-[color:var(--shop-primary)]";

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

  const composedName =
    preview.prefillDisplayName ||
    [preview.prefillFirstName, preview.prefillLastName].filter(Boolean).join(" ") ||
    "";

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
      <input type="hidden" name="firstName" value={preview.prefillFirstName ?? ""} />
      <input type="hidden" name="lastName" value={preview.prefillLastName ?? ""} />

      <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">Contact</h2>
        <div className="space-y-3">
          <div>
            <FieldLabel htmlFor="displayName" required>
              Full name
            </FieldLabel>
            <input
              id="displayName"
              name="displayName"
              required
              aria-required="true"
              autoComplete="name"
              className={fieldClass}
              placeholder="Your name"
              defaultValue={composedName}
            />
          </div>
          <div>
            <FieldLabel htmlFor="phone" required>
              Phone
            </FieldLabel>
            <input
              id="phone"
              name="phone"
              required
              aria-required="true"
              type="tel"
              autoComplete="tel"
              className={fieldClass}
              placeholder="+855 12 345 678"
              defaultValue={preview.prefillPhone ?? ""}
            />
          </div>
          <div>
            <FieldLabel htmlFor="email">
              Email{" "}
              <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
            </FieldLabel>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              className={fieldClass}
              placeholder="you@example.com"
              defaultValue={preview.prefillEmail ?? ""}
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
        savedAddresses={preview.savedAddresses}
        defaultAddressId={preview.defaultAddressId}
        isAuthenticated={preview.isAuthenticated}
      />

      <CheckoutPaymentFields
        paymentMethod={paymentMethod}
        onPaymentMethodChange={setPaymentMethod}
        codEnabled={preview.codEnabled}
        abaAvailable={preview.abaAvailable}
        abaInstructions={abaCopy}
        abaQrImageUrl={preview.abaQrImageUrl}
        abaAccountName={preview.abaAccountName}
        abaAccountNumber={preview.abaAccountNumber}
        amountLabel={formatMoney(totalMinor, preview.cart.currency)}
      />

      <CheckoutOrderReview
        cart={preview.cart}
        deliveryFeeMinor={preview.deliveryFeeMinor}
        fulfillmentMethod={fulfillmentMethod}
        freeDeliveryThresholdMinor={preview.freeDeliveryThresholdMinor}
      />

      {state.error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-[color:var(--shop-line)] bg-[color:var(--shop-bg)]/95 px-4 py-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] backdrop-blur">
        <button
          type="submit"
          disabled={pending}
          className="flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--shop-primary)] text-sm font-semibold text-[color:var(--shop-on-primary)] disabled:opacity-60"
        >
          {pending
            ? "Placing order…"
            : `Place order · ${formatMoney(totalMinor, preview.cart.currency)}`}
        </button>
      </div>
    </form>
  );
}
