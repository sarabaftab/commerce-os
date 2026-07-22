-- AlterTable tenants: typed order sequence (backfilled from config.orderSequence)
ALTER TABLE "tenants" ADD COLUMN "order_sequence" INTEGER NOT NULL DEFAULT 1;

UPDATE "tenants"
SET "order_sequence" = COALESCE(
  NULLIF(regexp_replace(COALESCE(config->>'orderSequence', '1'), '[^0-9]', '', 'g'), '')::int,
  1
)
WHERE TRUE;

-- AlterTable orders: snapshot pickup address
ALTER TABLE "orders" ADD COLUMN "pickup_location_address" TEXT;

-- CreateTable tenant_settings
CREATE TABLE "tenant_settings" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "display_name" TEXT,
    "logo_url" TEXT,
    "phone" TEXT,
    "email" TEXT,
    "address" TEXT,
    "timezone" TEXT NOT NULL DEFAULT 'Asia/Phnom_Penh',
    "business_hours" TEXT,
    "delivery_enabled" BOOLEAN NOT NULL DEFAULT true,
    "delivery_fee_minor" INTEGER NOT NULL DEFAULT 0,
    "free_delivery_threshold_minor" INTEGER,
    "delivery_notes" TEXT,
    "pickup_enabled" BOOLEAN NOT NULL DEFAULT true,
    "cod_enabled" BOOLEAN NOT NULL DEFAULT true,
    "aba_enabled" BOOLEAN NOT NULL DEFAULT true,
    "aba_account_name" TEXT,
    "aba_account_number" TEXT,
    "aba_instructions" TEXT,
    "aba_qr_image_url" TEXT,
    "aba_customer_note" TEXT,
    "primary_color" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "tenant_settings_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "tenant_settings_tenant_id_key" ON "tenant_settings"("tenant_id");

ALTER TABLE "tenant_settings" ADD CONSTRAINT "tenant_settings_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Backfill one settings row per tenant from legacy config JSON
INSERT INTO "tenant_settings" (
  "id",
  "tenant_id",
  "display_name",
  "timezone",
  "delivery_enabled",
  "delivery_fee_minor",
  "pickup_enabled",
  "cod_enabled",
  "aba_enabled",
  "aba_instructions",
  "updated_at"
)
SELECT
  md5(t.id || '-settings')::text,
  t.id,
  COALESCE(t.config->>'brand', t.name),
  COALESCE(t.config->>'timezone', 'Asia/Phnom_Penh'),
  true,
  COALESCE((t.config->'checkout'->>'deliveryFeeMinor')::int, 0),
  true,
  true,
  true,
  t.config->'checkout'->>'abaInstructions',
  CURRENT_TIMESTAMP
FROM "tenants" t
ON CONFLICT ("tenant_id") DO NOTHING;

-- CreateTable pickup_locations
CREATE TABLE "pickup_locations" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "instructions" TEXT,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "sort_order" INTEGER NOT NULL DEFAULT 0,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "pickup_locations_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "pickup_locations_tenant_id_is_active_sort_order_idx" ON "pickup_locations"("tenant_id", "is_active", "sort_order");

ALTER TABLE "pickup_locations" ADD CONSTRAINT "pickup_locations_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- Migrate legacy checkout.pickupLocations JSON into rows (preserve id when present)
INSERT INTO "pickup_locations" (
  "id",
  "tenant_id",
  "name",
  "address",
  "instructions",
  "is_active",
  "sort_order",
  "updated_at"
)
SELECT
  COALESCE(loc->>'id', md5(t.id || COALESCE(loc->>'name', '') || gs.ord::text)),
  t.id,
  COALESCE(loc->>'name', 'Pickup'),
  COALESCE(loc->>'address', 'Address TBD'),
  loc->>'instructions',
  true,
  gs.ord - 1,
  CURRENT_TIMESTAMP
FROM "tenants" t
CROSS JOIN LATERAL jsonb_array_elements(COALESCE(t.config->'checkout'->'pickupLocations', '[]'::jsonb)) WITH ORDINALITY AS gs(loc, ord)
WHERE jsonb_typeof(t.config->'checkout'->'pickupLocations') = 'array';

-- Backfill ABA account placeholders when instructions exist so checkout can offer ABA after migrate
UPDATE "tenant_settings"
SET
  "aba_account_name" = COALESCE("aba_account_name", 'KIN A2 Milk'),
  "aba_account_number" = COALESCE("aba_account_number", '000 000 000')
WHERE "aba_instructions" IS NOT NULL AND "aba_enabled" = true;
