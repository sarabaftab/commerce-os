-- Manual campaign promotions + order name snapshot (additive, nullable-safe).

CREATE TYPE "PromotionDiscountType" AS ENUM ('percentage', 'fixed');

CREATE TABLE "promotions" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "banner_text" TEXT,
    "type" "PromotionDiscountType" NOT NULL,
    "value" INTEGER NOT NULL,
    "minimum_subtotal_minor" INTEGER,
    "starts_at" TIMESTAMP(3),
    "ends_at" TIMESTAMP(3),
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "promotions_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "promotions_tenant_id_is_active_created_at_idx" ON "promotions"("tenant_id", "is_active", "created_at");

ALTER TABLE "promotions" ADD CONSTRAINT "promotions_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "promotion_name_snapshot" TEXT;
