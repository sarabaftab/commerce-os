-- Selling unit for catalog display copy, plus order-line snapshots.
CREATE TYPE "SellingUnit" AS ENUM ('item', 'pack', 'case');

ALTER TABLE "products" ADD COLUMN "selling_unit" "SellingUnit" NOT NULL DEFAULT 'item';

-- Existing KIN catalog is sold by the case.
UPDATE "products" SET "selling_unit" = 'case';

ALTER TABLE "order_items" ADD COLUMN "volume_snapshot" TEXT;
ALTER TABLE "order_items" ADD COLUMN "selling_unit_snapshot" "SellingUnit";
