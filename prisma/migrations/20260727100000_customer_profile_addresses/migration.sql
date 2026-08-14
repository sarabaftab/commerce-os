-- AlterTable customers
ALTER TABLE "customers" ADD COLUMN "first_name" TEXT;
ALTER TABLE "customers" ADD COLUMN "last_name" TEXT;

-- CreateTable customer_addresses
CREATE TABLE "customer_addresses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "label" TEXT NOT NULL,
    "recipient_first_name" TEXT NOT NULL,
    "recipient_last_name" TEXT NOT NULL,
    "phone" TEXT NOT NULL,
    "address_line_1" TEXT NOT NULL,
    "address_line_2" TEXT,
    "city_or_district" TEXT NOT NULL,
    "province_or_state" TEXT NOT NULL,
    "postal_code" TEXT,
    "country_code" CHAR(2) NOT NULL DEFAULT 'KH',
    "delivery_instructions" TEXT,
    "is_default" BOOLEAN NOT NULL DEFAULT false,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_addresses_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "customer_addresses_tenant_id_customer_id_idx" ON "customer_addresses"("tenant_id", "customer_id");
CREATE INDEX "customer_addresses_tenant_id_customer_id_is_active_idx" ON "customer_addresses"("tenant_id", "customer_id", "is_active");
CREATE INDEX "customer_addresses_tenant_id_customer_id_is_default_idx" ON "customer_addresses"("tenant_id", "customer_id", "is_default");

-- One active default address per customer per tenant
CREATE UNIQUE INDEX "customer_addresses_one_active_default_idx"
ON "customer_addresses"("tenant_id", "customer_id")
WHERE "is_default" = true AND "is_active" = true;

ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_addresses" ADD CONSTRAINT "customer_addresses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AlterTable orders — richer delivery snapshots
ALTER TABLE "orders" ADD COLUMN "address_line_2" TEXT;
ALTER TABLE "orders" ADD COLUMN "province_or_state" TEXT;
ALTER TABLE "orders" ADD COLUMN "postal_code" TEXT;
ALTER TABLE "orders" ADD COLUMN "country_code" CHAR(2);
ALTER TABLE "orders" ADD COLUMN "recipient_first_name" TEXT;
ALTER TABLE "orders" ADD COLUMN "recipient_last_name" TEXT;
ALTER TABLE "orders" ADD COLUMN "recipient_phone" TEXT;
ALTER TABLE "orders" ADD COLUMN "address_label" TEXT;
ALTER TABLE "orders" ADD COLUMN "source_address_id" TEXT;

CREATE INDEX "orders_tenant_id_customer_id_placed_at_idx" ON "orders"("tenant_id", "customer_id", "placed_at");
