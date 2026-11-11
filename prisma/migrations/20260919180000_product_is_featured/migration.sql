-- Explicit homepage Featured flag. Backfill preserves prior "first 6 by sort order" behavior.

ALTER TABLE "products" ADD COLUMN IF NOT EXISTS "is_featured" BOOLEAN NOT NULL DEFAULT false;

CREATE INDEX IF NOT EXISTS "products_tenant_id_is_featured_is_available_idx"
  ON "products"("tenant_id", "is_featured", "is_available");

-- Mark each tenant's current homepage Featured set (available, not deleted, top 6 by sort).
WITH ranked AS (
  SELECT
    id,
    ROW_NUMBER() OVER (
      PARTITION BY tenant_id
      ORDER BY sort_order ASC, name ASC
    ) AS rn
  FROM products
  WHERE deleted_at IS NULL
    AND is_available = true
)
UPDATE products
SET is_featured = true
FROM ranked
WHERE products.id = ranked.id
  AND ranked.rn <= 6;
