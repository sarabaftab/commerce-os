-- Optional delivery pin coordinates (additive; existing text-only addresses/orders unchanged).

ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "latitude" DOUBLE PRECISION;
ALTER TABLE "customer_addresses" ADD COLUMN IF NOT EXISTS "longitude" DOUBLE PRECISION;

ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_latitude" DOUBLE PRECISION;
ALTER TABLE "orders" ADD COLUMN IF NOT EXISTS "delivery_longitude" DOUBLE PRECISION;
