-- buy_one_get_one promotions + stock quantity + order-line fulfillment snapshots.

ALTER TYPE "PromotionDiscountType" ADD VALUE 'buy_one_get_one';

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "stock_quantity" INTEGER;

ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "free_quantity" INTEGER NOT NULL DEFAULT 0;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "fulfillment_quantity" INTEGER;
UPDATE "order_items" SET "fulfillment_quantity" = "quantity" WHERE "fulfillment_quantity" IS NULL;
ALTER TABLE "order_items" ALTER COLUMN "fulfillment_quantity" SET NOT NULL;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "promotion_id_snapshot" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "promotion_name_snapshot" TEXT;
ALTER TABLE "order_items" ADD COLUMN IF NOT EXISTS "promotion_type_snapshot" TEXT;

CREATE TABLE IF NOT EXISTS "promotion_products" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "promotion_id" TEXT NOT NULL,
    "product_id" TEXT NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "promotion_products_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "promotion_products_promotion_id_product_id_key"
  ON "promotion_products"("promotion_id", "product_id");
CREATE INDEX IF NOT EXISTS "promotion_products_tenant_id_product_id_idx"
  ON "promotion_products"("tenant_id", "product_id");
CREATE INDEX IF NOT EXISTS "promotion_products_product_id_idx"
  ON "promotion_products"("product_id");

DO $$ BEGIN
  ALTER TABLE "promotion_products"
    ADD CONSTRAINT "promotion_products_promotion_id_fkey"
    FOREIGN KEY ("promotion_id") REFERENCES "promotions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;

DO $$ BEGIN
  ALTER TABLE "promotion_products"
    ADD CONSTRAINT "promotion_products_product_id_fkey"
    FOREIGN KEY ("product_id") REFERENCES "products"("id") ON DELETE CASCADE ON UPDATE CASCADE;
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
