import { ProductImage } from "@/ui/storefront/product-image";

type AbaPaymentDetailsProps = {
  qrImageUrl?: string | null;
  accountName?: string | null;
  accountNumber?: string | null;
  amountLabel?: string | null;
  instructions?: string | null;
  customerNote?: string | null;
  showProofNote?: boolean;
};

export function AbaPaymentDetails({
  qrImageUrl,
  accountName,
  accountNumber,
  amountLabel,
  instructions,
  customerNote,
  showProofNote = false,
}: AbaPaymentDetailsProps) {
  return (
    <div className="space-y-3">
      <p className="font-medium">ABA Bank Transfer</p>
      {qrImageUrl ? (
        <div className="relative mx-auto h-56 w-56 overflow-hidden rounded-xl bg-white">
          <ProductImage
            src={qrImageUrl}
            alt="ABA payment QR code"
            sizes="224px"
            className="object-contain"
          />
        </div>
      ) : null}
      {qrImageUrl ? <p className="text-sm">Scan the QR code to pay.</p> : null}
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
          You can upload your payment proof after placing the order.
        </p>
      ) : null}
    </div>
  );
}
