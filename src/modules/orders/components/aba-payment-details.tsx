"use client";

import { ProductImage } from "@/ui/storefront/product-image";
import { useLocale } from "@/shared/i18n";

type AbaPaymentDetailsProps = {
  qrImageUrl?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  amountLabel?: string | null;
  instructions?: string | null;
  customerNote?: string | null;
  /** Checkout/confirmation helper about uploading later. */
  showProofNote?: boolean;
  /** Numbered Scan → Pay → Upload guidance. */
  showCheckoutSteps?: boolean;
};

export function AbaPaymentDetails({
  qrImageUrl,
  accountName,
  accountNumber,
  amountLabel,
  instructions,
  customerNote,
  showProofNote = false,
  showCheckoutSteps = false,
}: AbaPaymentDetailsProps) {
  const { t } = useLocale();

  return (
    <div className="space-y-3">
      <p className="font-medium">{t("payWithAba")}</p>

      {showCheckoutSteps ? (
        <ol className="space-y-3 text-sm">
          <li className="space-y-1">
            <p className="font-medium">{t("abaStepScan")}</p>
          </li>
          <li className="space-y-1">
            <p className="font-medium">{t("abaStepUpload")}</p>
          </li>
        </ol>
      ) : null}

      {qrImageUrl ? (
        <div className="relative mx-auto aspect-square w-full max-w-[14rem] overflow-hidden rounded-xl bg-white sm:max-w-[16rem]">
          <ProductImage
            src={qrImageUrl}
            alt={t("payWithAba")}
            sizes="(max-width: 640px) 224px, 256px"
            className="object-contain"
          />
        </div>
      ) : null}
      {accountName ? (
        <p className="text-sm">
          <span className="text-[color:var(--shop-ink-muted)]">{t("accountName")}:</span>{" "}
          {accountName}
        </p>
      ) : null}
      {accountNumber ? (
        <p className="text-sm">
          <span className="text-[color:var(--shop-ink-muted)]">{t("accountNumber")}:</span>{" "}
          {accountNumber}
        </p>
      ) : null}
      {amountLabel ? (
        <p className="text-sm font-semibold">
          <span className="font-normal text-[color:var(--shop-ink-muted)]">{t("amount")}:</span>{" "}
          {amountLabel}
        </p>
      ) : null}
      {instructions ? (
        <p className="whitespace-pre-line text-sm leading-relaxed text-[color:var(--shop-ink-muted)]">
          {instructions}
        </p>
      ) : null}
      {customerNote ? (
        <p className="whitespace-pre-line text-sm text-[color:var(--shop-ink-muted)]">
          {customerNote}
        </p>
      ) : null}
      {showProofNote ? (
        <p className="text-sm text-[color:var(--shop-ink-muted)]">{t("uploadLaterNote")}</p>
      ) : null}
    </div>
  );
}
