"use client";

import { useLocale } from "@/shared/i18n";

import { AbaPaymentDetails } from "./aba-payment-details";
import { FieldLabel } from "@/ui/components/field-label";

type CheckoutPaymentFieldsProps = {
  paymentMethod: "cod" | "aba_transfer";
  onPaymentMethodChange: (method: "cod" | "aba_transfer") => void;
  codEnabled: boolean;
  /** Store setting + merchandise subtotal eligibility (below $30). */
  codSelectable: boolean;
  abaAvailable: boolean;
  abaInstructions?: string | null;
  abaQrImageUrl?: string | null;
  abaAccountName?: string | null;
  abaAccountNumber?: string | null;
  abaCustomerNote?: string | null;
  amountLabel?: string | null;
};

const fieldClass =
  "h-11 w-full rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] px-3 text-sm outline-none focus:border-[color:var(--shop-primary)]";

export function CheckoutPaymentFields({
  paymentMethod,
  onPaymentMethodChange,
  codEnabled,
  codSelectable,
  abaAvailable,
  abaInstructions,
  abaQrImageUrl,
  abaAccountName,
  abaAccountNumber,
  abaCustomerNote,
  amountLabel,
}: CheckoutPaymentFieldsProps) {
  const { t } = useLocale();
  const selectableMethods = [
    ...(codSelectable ? (["cod"] as const) : []),
    ...(abaAvailable ? (["aba_transfer"] as const) : []),
  ];
  const showCodDisabled = codEnabled && !codSelectable;
  const showChooser =
    selectableMethods.length > 1 ||
    (showCodDisabled && abaAvailable) ||
    (showCodDisabled && !abaAvailable);

  return (
    <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
      <h2 className="text-sm font-semibold">{t("payment")}</h2>

      {showChooser ? (
        <div className="space-y-2">
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
            {codEnabled ? (
              <label
                className={`flex flex-col rounded-xl border px-3 py-3 text-sm ${
                  codSelectable ? "cursor-pointer" : "cursor-not-allowed opacity-60"
                } ${
                  paymentMethod === "cod" && codSelectable
                    ? "border-[color:var(--shop-primary)] bg-[color:var(--shop-primary)]/20"
                    : "border-[color:var(--shop-line)]"
                }`}
              >
                <input
                  type="radio"
                  name="paymentMethod"
                  value="cod"
                  checked={paymentMethod === "cod" && codSelectable}
                  disabled={!codSelectable}
                  onChange={() => {
                    if (codSelectable) {
                      onPaymentMethodChange("cod");
                    }
                  }}
                  className="sr-only"
                />
                <span className="font-medium">{t("cashOnDelivery")}</span>
                <span className="mt-1 text-xs text-[color:var(--shop-ink-muted)]">
                  {t("cashOnDeliveryHint")}
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
                <span className="font-medium">{t("abaTransferShort")}</span>
                <span className="mt-1 text-xs text-[color:var(--shop-ink-muted)]">
                  {t("abaTransferHint")}
                </span>
              </label>
            ) : null}
          </div>

          {showCodDisabled ? (
            <p
              role="status"
              className="rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface)] px-3 py-2 text-xs leading-relaxed text-[color:var(--shop-ink-muted)]"
            >
              {t("codUnavailableOverLimit")}
            </p>
          ) : null}
        </div>
      ) : (
        <input type="hidden" name="paymentMethod" value={selectableMethods[0] ?? "cod"} />
      )}

      {paymentMethod === "aba_transfer" && abaAvailable ? (
        <div className="space-y-3">
          <AbaPaymentDetails
            qrImageUrl={abaQrImageUrl}
            accountName={abaAccountName}
            accountNumber={abaAccountNumber}
            amountLabel={amountLabel}
            instructions={abaInstructions}
            customerNote={abaCustomerNote}
            showProofNote
            showCheckoutSteps
          />
          <div>
            <FieldLabel htmlFor="paymentReference">{t("paymentReferenceOptional")}</FieldLabel>
            <input
              id="paymentReference"
              name="paymentReference"
              className={fieldClass}
              placeholder={t("paymentReferencePlaceholder")}
            />
          </div>
        </div>
      ) : null}
    </div>
  );
}
