-- Add canonical E.164 phone for customer identity matching.
-- Non-unique: existing duplicates must be reconciled before a unique constraint.

ALTER TABLE "customers" ADD COLUMN "phone_normalized" TEXT;

CREATE INDEX "customers_tenant_id_phone_normalized_idx" ON "customers"("tenant_id", "phone_normalized");
