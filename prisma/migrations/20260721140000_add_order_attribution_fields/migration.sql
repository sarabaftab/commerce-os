-- AlterTable
ALTER TABLE "orders" ADD COLUMN "promotion_id" TEXT,
ADD COLUMN "referral_code" TEXT,
ADD COLUMN "campaign_id" TEXT;

-- CreateIndex
CREATE INDEX "orders_tenant_id_promotion_id_idx" ON "orders"("tenant_id", "promotion_id");

-- CreateIndex
CREATE INDEX "orders_tenant_id_campaign_id_idx" ON "orders"("tenant_id", "campaign_id");
