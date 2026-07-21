"use client";

type CheckoutPaymentFieldsProps = {
  paymentMethod: "cod" | "aba_transfer";
  onPaymentMethodChange: (method: "cod" | "aba_transfer") => void;
  abaInstructions: string;
};

const fieldClass =
  "h-11 w-full rounded-xl border border-[color:var(--shop-line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--shop-accent)]";

export function CheckoutPaymentFields({
  paymentMethod,
  onPaymentMethodChange,
  abaInstructions,
}: CheckoutPaymentFieldsProps) {
  return (
    <div className="space-y-4 rounded-2xl bg-white/80 p-4 ring-1 ring-[color:var(--shop-line)]">
      <h2 className="text-sm font-semibold">Payment</h2>

      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <label
          className={`flex cursor-pointer flex-col rounded-xl border px-3 py-3 text-sm ${
            paymentMethod === "cod"
              ? "border-[color:var(--shop-accent)] bg-[color:var(--shop-accent)]/10"
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

        <label
          className={`flex cursor-pointer flex-col rounded-xl border px-3 py-3 text-sm ${
            paymentMethod === "aba_transfer"
              ? "border-[color:var(--shop-accent)] bg-[color:var(--shop-accent)]/10"
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
      </div>

      {paymentMethod === "aba_transfer" ? (
        <div className="space-y-3">
          {abaInstructions ? (
            <div className="rounded-xl bg-[color:var(--shop-surface)] p-3 text-sm leading-relaxed text-[color:var(--shop-ink-muted)]">
              {abaInstructions}
            </div>
          ) : null}
          <div>
            <label htmlFor="paymentReference" className="mb-1 block text-xs font-medium">
              Payment reference <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
            </label>
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
