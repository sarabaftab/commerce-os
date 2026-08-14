-- P2: targeted indexes for hot storefront/admin query patterns.
-- Drop superseded weaker indexes before creating replacements.

-- Categories: active storefront listing (tenant + soft-delete + active + sort)
DROP INDEX IF EXISTS "categories_tenant_id_idx";
CREATE INDEX "categories_tenant_id_deleted_at_is_active_sort_order_idx"
  ON "categories" ("tenant_id", "deleted_at", "is_active", "sort_order");

-- Products: storefront list + category filter (deletedAt + availability + sort)
CREATE INDEX "products_tenant_id_deleted_at_is_available_sort_order_idx"
  ON "products" ("tenant_id", "deleted_at", "is_available", "sort_order");
CREATE INDEX "products_tenant_id_category_id_deleted_at_is_available_idx"
  ON "products" ("tenant_id", "category_id", "deleted_at", "is_available");

-- Product media: ordered primary image fetch
DROP INDEX IF EXISTS "product_media_product_id_idx";
CREATE INDEX "product_media_product_id_sort_order_idx"
  ON "product_media" ("product_id", "sort_order");

-- Orders: admin default chronological list + status-filtered list
DROP INDEX IF EXISTS "orders_tenant_id_status_idx";
CREATE INDEX "orders_tenant_id_status_placed_at_idx"
  ON "orders" ("tenant_id", "status", "placed_at");
CREATE INDEX "orders_tenant_id_placed_at_idx"
  ON "orders" ("tenant_id", "placed_at");

-- Order status timeline
DROP INDEX IF EXISTS "order_status_history_order_id_idx";
CREATE INDEX "order_status_history_order_id_created_at_idx"
  ON "order_status_history" ("order_id", "created_at");

-- Carts: open cart by customer (hottest cart lookup)
DROP INDEX IF EXISTS "carts_tenant_id_customer_id_idx";
CREATE INDEX "carts_tenant_id_customer_id_status_idx"
  ON "carts" ("tenant_id", "customer_id", "status");
