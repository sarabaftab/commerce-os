-- CreateEnum
CREATE TYPE "FulfillmentMethod" AS ENUM ('delivery', 'pickup');

-- AlterTable
ALTER TABLE "orders" ADD COLUMN "order_number" TEXT,
ADD COLUMN "fulfillment_method" "FulfillmentMethod",
ADD COLUMN "address_line" TEXT,
ADD COLUMN "city_or_area" TEXT,
ADD COLUMN "delivery_instructions" TEXT,
ADD COLUMN "pickup_location_key" TEXT,
ADD COLUMN "pickup_location_name" TEXT,
ADD COLUMN "payment_reference" TEXT,
ADD COLUMN "delivery_fee_minor" INTEGER NOT NULL DEFAULT 0;

-- Backfill existing rows before NOT NULL constraints
UPDATE "orders"
SET
  "order_number" = 'LEGACY-' || "id",
  "fulfillment_method" = 'delivery'
WHERE "order_number" IS NULL;

ALTER TABLE "orders" ALTER COLUMN "order_number" SET NOT NULL;
ALTER TABLE "orders" ALTER COLUMN "fulfillment_method" SET NOT NULL;

-- CreateIndex
CREATE UNIQUE INDEX "orders_tenant_id_order_number_key" ON "orders"("tenant_id", "order_number");

-- CreateIndex
CREATE INDEX "customers_tenant_id_phone_idx" ON "customers"("tenant_id", "phone");
