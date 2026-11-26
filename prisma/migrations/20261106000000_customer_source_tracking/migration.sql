-- First-touch customer source. All columns nullable so existing rows stay valid.
-- Do not backfill: customers without a recorded source stay unattributed.

ALTER TABLE "customers" ADD COLUMN "source_kind" TEXT;
ALTER TABLE "customers" ADD COLUMN "source_key" TEXT;
ALTER TABLE "customers" ADD COLUMN "source_attributed_at" TIMESTAMP(3);

CREATE INDEX "customers_tenant_id_source_kind_idx" ON "customers"("tenant_id", "source_kind");
