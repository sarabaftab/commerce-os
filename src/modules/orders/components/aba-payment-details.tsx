import { ProductImage } from "@/ui/storefront/product-image";

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
  return (
    <div className="space-y-3">
      <p className="font-medium">Pay with ABA</p>

      {showCheckoutSteps ? (
        <ol className="space-y-3 text-sm">
          <li className="space-y-1">
            <p className="font-medium">1. Scan the QR code</p>
            <p className="text-[color:var(--shop-ink-muted)]">
              Scan the ABA QR code with your banking app and complete the payment.
            </p>
          </li>
          <li className="space-y-1">
            <p className="font-medium">2. Upload your payment confirmation</p>
            <p className="text-[color:var(--shop-ink-muted)]">
              After payment, upload a screenshot or photo showing that the transfer was
              successful. You can do this after placing your order.
            </p>
          </li>
        </ol>
      ) : null}

      {qrImageUrl ? (
        <div className="relative mx-auto aspect-square w-full max-w-[14rem] overflow-hidden rounded-xl bg-white sm:max-w-[16rem]">
          <ProductImage
            src={qrImageUrl}
            alt="ABA payment QR code"
            sizes="(max-width: 640px) 224px, 256px"
            className="object-contain"
          />
        </div>
      ) : null}
      {qrImageUrl && !showCheckoutSteps ? (
        <p className="text-sm">Scan the QR code with your banking app to pay.</p>
      ) : null}
      {accountName ? (
        <p className="text-sm">
          <span className="text-[color:var(--shop-ink-muted)]">Account name:</span>{" "}
          {accountName}
        </p>
      ) : null}
      {accountNumber ? (
        <p className="text-sm">
          <span className="text-[color:var(--shop-ink-muted)]">Account number:</span>{" "}
          {accountNumber}
        </p>
      ) : null}
      {amountLabel ? (
        <p className="text-sm font-semibold">
          <span className="font-normal text-[color:var(--shop-ink-muted)]">Amount:</span>{" "}
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
        <p className="text-sm text-[color:var(--shop-ink-muted)]">
          You can upload your payment confirmation later from your order details if you
          don&apos;t have it ready now.
        </p>
      ) : null}
    </div>
  );
}
