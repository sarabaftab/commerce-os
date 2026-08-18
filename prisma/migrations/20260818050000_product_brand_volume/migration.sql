-- Optional brand and pack size for catalog + CSV import.
ALTER TABLE "products" ADD COLUMN "brand" TEXT;
ALTER TABLE "products" ADD COLUMN "volume" TEXT;
