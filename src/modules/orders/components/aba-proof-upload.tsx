"use client";

import { useActionState, useId, useState } from "react";

import type { PaymentProofStatus } from "@prisma/client";

import {
  uploadPaymentProofAction,
  type PaymentProofActionState,
} from "@/modules/orders/actions/payment-proof-actions";
import {
  customerCanUploadPaymentProof,
  customerPaymentConfirmationCopy,
  isPaymentProofFileTooLarge,
  PAYMENT_PROOF_ACCEPT,
  PAYMENT_PROOF_TOO_LARGE_MESSAGE,
} from "@/modules/orders/payment-proof";
import { useLocale } from "@/shared/i18n";

type AbaProofUploadProps = {
  tenantSlug: string;
  orderNumber: string;
  paymentMethod: "cod" | "aba_transfer";
  paymentProofStatus: PaymentProofStatus;
  paymentProofRejectionReason: string | null;
  /** When true, mention that upload can happen later (checkout/confirmation). */
  showLaterNote?: boolean;
};

const initial: PaymentProofActionState = {};

function formatFileSize(bytes: number): string {
  if (bytes < 1024) {
    return `${bytes} B`;
  }
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function AbaProofUpload({
  tenantSlug,
  orderNumber,
  paymentMethod,
  paymentProofStatus,
  paymentProofRejectionReason,
  showLaterNote = false,
}: AbaProofUploadProps) {
  const { t } = useLocale();
  const inputId = useId();
  const [selectedFile, setSelectedFile] = useState<{ name: string; size: number } | null>(
    null,
  );
  const [clientError, setClientError] = useState<string | null>(null);
  const [state, action, pending] = useActionState(
    uploadPaymentProofAction.bind(null, tenantSlug, orderNumber),
    initial,
  );

  if (paymentMethod !== "aba_transfer") {
    return null;
  }

  const effectiveStatus = state.success ? "submitted" : paymentProofStatus;
  const canUpload = customerCanUploadPaymentProof({
    paymentMethod,
    paymentProofStatus: effectiveStatus,
  });
  const copy = (() => {
    switch (effectiveStatus) {
      case "awaiting_proof":
        return { title: t("paymentConfirmationNeeded"), body: t("paymentConfirmationNeededBody") };
      case "submitted":
        return { title: t("paymentConfirmationSubmitted"), body: t("paymentConfirmationSubmittedBody") };
      case "verified":
        return { title: t("paymentVerified"), body: t("paymentVerifiedBody") };
      case "rejected":
        return { title: t("paymentNeedsAttention"), body: t("paymentNeedsAttentionBody") };
      default:
        return customerPaymentConfirmationCopy(effectiveStatus);
    }
  })();
  const uploadLabel =
    effectiveStatus === "rejected"
      ? t("uploadNewPaymentConfirmation")
      : t("uploadPaymentConfirmation");
  const fileTooLarge = selectedFile ? isPaymentProofFileTooLarge(selectedFile.size) : false;
  const displayError = clientError ?? (fileTooLarge ? t("imageTooLarge") : null) ?? state.error;
  const submitDisabled = pending || !selectedFile || fileTooLarge;

  return (
    <div className="space-y-3 rounded-xl bg-[color:var(--shop-surface)] p-3">
      <div className="space-y-1">
        <p className="text-sm font-semibold">{copy.title}</p>
        {copy.body ? (
          <p className="text-sm leading-relaxed text-[color:var(--shop-ink-muted)]">{copy.body}</p>
        ) : null}
      </div>

      {effectiveStatus === "rejected" && paymentProofRejectionReason ? (
        <p className="text-sm text-destructive" role="status">
          {paymentProofRejectionReason}
        </p>
      ) : null}

      {state.success ? (
        <p className="text-sm text-emerald-700" role="status">
          {t("uploadSuccess")}
        </p>
      ) : null}

      {canUpload ? (
        <form
          action={action}
          className="space-y-3"
          onSubmit={(event) => {
            if (!selectedFile) {
              event.preventDefault();
              setClientError(t("choosePaymentFile"));
              return;
            }
            if (isPaymentProofFileTooLarge(selectedFile.size)) {
              event.preventDefault();
              setClientError(PAYMENT_PROOF_TOO_LARGE_MESSAGE);
            }
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor={inputId} className="block text-sm font-medium">
              {uploadLabel}
            </label>
<p className="text-xs text-[color:var(--shop-ink-muted)]">{t("uploadProofHint")}</p>
            <input
              id={inputId}
              name="proof"
              type="file"
              accept={PAYMENT_PROOF_ACCEPT}
              required
              disabled={pending}
              className="block w-full text-sm file:mr-3 file:rounded-full file:border-0 file:bg-[color:var(--shop-primary)] file:px-3 file:py-2 file:text-sm file:font-semibold file:text-[color:var(--shop-on-primary)]"
              onChange={(event) => {
                const file = event.target.files?.[0];
                setClientError(null);
                if (!file) {
                  setSelectedFile(null);
                  return;
                }
                setSelectedFile({ name: file.name, size: file.size });
                if (isPaymentProofFileTooLarge(file.size)) {
                  setClientError(PAYMENT_PROOF_TOO_LARGE_MESSAGE);
                }
              }}
            />
            <p className="text-xs text-[color:var(--shop-ink-muted)]">
              {t("paymentProofRequirements")}
            </p>
            {selectedFile ? (
              <p className="truncate text-sm" role="status">
                {t("selectedFile")}: {selectedFile.name}
                <span className="text-[color:var(--shop-ink-muted)]">
                  {" "}
                  · {formatFileSize(selectedFile.size)}
                </span>
              </p>
            ) : null}
          </div>

          {showLaterNote && effectiveStatus === "awaiting_proof" ? (
<p className="text-xs leading-relaxed text-[color:var(--shop-ink-muted)]">{t("uploadLaterNote")}</p>
          ) : null}

          {displayError ? (
            <p role="alert" className="text-sm text-destructive">
              {displayError}
            </p>
          ) : null}

          <button
            type="submit"
            disabled={submitDisabled}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[color:var(--shop-primary)] text-sm font-semibold text-[color:var(--shop-on-primary)] disabled:opacity-60"
          >
{pending ? t("uploading") : uploadLabel}
          </button>
        </form>
      ) : null}
    </div>
  );
}
