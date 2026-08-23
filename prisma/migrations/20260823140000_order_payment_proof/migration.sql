-- ABA transfer proof is tracked separately from order status.
CREATE TYPE "PaymentProofStatus" AS ENUM ('not_required', 'awaiting_proof', 'submitted', 'verified', 'rejected');

ALTER TABLE "orders" ADD COLUMN "payment_proof_status" "PaymentProofStatus" NOT NULL DEFAULT 'not_required';
ALTER TABLE "orders" ADD COLUMN "payment_proof_path" TEXT;
ALTER TABLE "orders" ADD COLUMN "payment_proof_content_type" TEXT;
ALTER TABLE "orders" ADD COLUMN "payment_proof_submitted_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "payment_proof_reviewed_at" TIMESTAMP(3);
ALTER TABLE "orders" ADD COLUMN "payment_proof_rejection_reason" TEXT;
