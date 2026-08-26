"use client";

import { ProductImage } from "@/ui/storefront/product-image";
import { FieldLabel } from "@/ui/components/field-label";

type CheckoutPaymentFieldsProps = {
  paymentMethod: "cod" | "aba_transfer";
  onPaymentMethodChange: (method: "cod" | "aba_transfer") => void;
  codEnabled: boolean;
  abaAvailable: boolean;
  abaInstructions: string;
  abaQrImageUrl?: string | null;
  abaAccountName?: string | null;
  abaAccountNumber?: string | null;
  amountLabel?: string | null;
};

const fieldClass =
  "h-11 w-full rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] px-3 text-sm outline-none focus:border-[color:var(--shop-primary)]";

export function CheckoutPaymentFields({
  paymentMethod,
  onPaymentMethodChange,
  codEnabled,
  abaAvailable,
  abaInstructions,
  abaQrImageUrl,
  abaAccountName,
  abaAccountNumber,
  amountLabel,
}: CheckoutPaymentFieldsProps) {
  const methods = [
    ...(codEnabled ? (["cod"] as const) : []),
    ...(abaAvailable ? (["aba_transfer"] as const) : []),
  ];

  return (
    <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
      <h2 className="text-sm font-semibold">Payment</h2>

      {methods.length > 1 ? (
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {codEnabled ? (
            <label
              className={`flex cursor-pointer flex-col rounded-xl border px-3 py-3 text-sm ${
                paymentMethod === "cod"
                  ? "border-[color:var(--shop-primary)] bg-[color:var(--shop-primary)]/20"
                  : "border-[color:var(--shop-line)]"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="cod"
                checked={paymentMethod === "cod"}
                onChange={() => onPaymentMethodChange("cod")}
                className="sr-only"
              />
              <span className="font-medium">Cash on Delivery</span>
              <span className="mt-1 text-xs text-[color:var(--shop-ink-muted)]">
                Pay when your order arrives
              </span>
            </label>
          ) : null}

          {abaAvailable ? (
            <label
              className={`flex cursor-pointer flex-col rounded-xl border px-3 py-3 text-sm ${
                paymentMethod === "aba_transfer"
                  ? "border-[color:var(--shop-primary)] bg-[color:var(--shop-primary)]/20"
                  : "border-[color:var(--shop-line)]"
              }`}
            >
              <input
                type="radio"
                name="paymentMethod"
                value="aba_transfer"
                checked={paymentMethod === "aba_transfer"}
                onChange={() => onPaymentMethodChange("aba_transfer")}
                className="sr-only"
              />
              <span className="font-medium">ABA Transfer</span>
              <span className="mt-1 text-xs text-[color:var(--shop-ink-muted)]">
                Bank transfer before fulfillment
              </span>
            </label>
          ) : null}
        </div>
      ) : (
        <input type="hidden" name="paymentMethod" value={methods[0] ?? "cod"} />
      )}

      {paymentMethod === "aba_transfer" && abaAvailable ? (
        <div className="space-y-3">
          <p className="text-sm">
            Please transfer your order total, then upload a screenshot on the confirmation page.
          </p>
          {amountLabel ? (
            <p className="text-sm font-semibold">Amount: {amountLabel}</p>
          ) : null}
          {abaAccountName ? (
            <p className="text-sm">Account name: {abaAccountName}</p>
          ) : null}
          {abaAccountNumber ? (
            <p className="text-sm">Account number: {abaAccountNumber}</p>
          ) : null}
          {abaInstructions ? (
            <div className="whitespace-pre-line rounded-xl bg-[color:var(--shop-surface)] p-3 text-sm leading-relaxed text-[color:var(--shop-ink-muted)]">
              {abaInstructions}
            </div>
          ) : null}
          {abaQrImageUrl ? (
            <div className="relative mx-auto h-48 w-48 overflow-hidden rounded-xl">
              <ProductImage
                src={abaQrImageUrl}
                alt="ABA payment QR"
                sizes="192px"
                className="object-contain"
              />
            </div>
          ) : null}
          <div>
            <FieldLabel htmlFor="paymentReference">
              Payment reference{" "}
              <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
            </FieldLabel>
            <input
              id="paymentReference"
              name="paymentReference"
              className={fieldClass}
              placeholder="Transaction ID or reference"
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
