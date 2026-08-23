"use client";

import { useActionState } from "react";

import type { PaymentProofStatus } from "@prisma/client";

import {
  uploadPaymentProofAction,
  type PaymentProofActionState,
} from "@/modules/orders/actions/payment-proof-actions";
import { customerCanUploadPaymentProof, paymentProofStatusLabel } from "@/modules/orders/payment-proof";

type AbaProofUploadProps = {
  tenantSlug: string;
  orderNumber: string;
  paymentMethod: "cod" | "aba_transfer";
  paymentProofStatus: PaymentProofStatus;
  paymentProofRejectionReason: string | null;
};

const initial: PaymentProofActionState = {};

export function AbaProofUpload({
  tenantSlug,
  orderNumber,
  paymentMethod,
  paymentProofStatus,
  paymentProofRejectionReason,
}: AbaProofUploadProps) {
  const [state, action, pending] = useActionState(
    uploadPaymentProofAction.bind(null, tenantSlug, orderNumber),
    initial,
  );

  if (paymentMethod !== "aba_transfer") {
    return null;
  }

  const canUpload = customerCanUploadPaymentProof({
    paymentMethod,
    paymentProofStatus,
  });

  return (
    <div className="space-y-2 rounded-xl bg-[color:var(--shop-surface)] p-3">
      <p className="text-sm">
        Proof: {paymentProofStatusLabel(paymentProofStatus)}
        {paymentProofStatus === "submitted" ? " · Verification: Pending" : null}
        {paymentProofStatus === "verified" ? " · Verification: Verified" : null}
      </p>
      {paymentProofStatus === "rejected" && paymentProofRejectionReason ? (
        <p className="text-sm text-destructive">{paymentProofRejectionReason}</p>
      ) : null}
      {paymentProofStatus === "rejected" ? (
        <p className="text-sm text-[color:var(--shop-ink-muted)]">Proof requires attention.</p>
      ) : null}
      {canUpload ? (
        <form action={action} className="space-y-2">
          <label htmlFor="proof" className="block text-xs font-medium">
            Transfer screenshot
          </label>
          <input
            id="proof"
            name="proof"
            type="file"
            accept="image/png,image/jpeg,image/webp"
            required
            className="block w-full text-sm"
          />
          <p className="text-xs text-[color:var(--shop-ink-muted)]">PNG, JPG, or WEBP · max 5 MB</p>
          {state.error ? (
            <p role="alert" className="text-sm text-destructive">
              {state.error}
            </p>
          ) : null}
          <button
            type="submit"
            disabled={pending}
            className="flex h-11 w-full items-center justify-center rounded-full bg-[color:var(--shop-primary)] text-sm font-semibold text-[color:var(--shop-on-primary)] disabled:opacity-60"
          >
            {pending ? "Uploading…" : paymentProofStatus === "rejected" ? "Upload new proof" : "Upload proof"}
          </button>
        </form>
      ) : null}
    </div>
  );
}
