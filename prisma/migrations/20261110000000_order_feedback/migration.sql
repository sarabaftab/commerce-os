-- Customer feedback for completed orders. One row per order.
-- Additive only; existing orders remain valid without feedback.

CREATE TABLE "order_feedback" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "rating" INTEGER NOT NULL,
    "comment" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "order_feedback_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "order_feedback_order_id_key" ON "order_feedback"("order_id");

CREATE INDEX "order_feedback_tenant_id_created_at_idx" ON "order_feedback"("tenant_id", "created_at");

CREATE INDEX "order_feedback_tenant_id_rating_idx" ON "order_feedback"("tenant_id", "rating");

CREATE INDEX "order_feedback_tenant_id_customer_id_idx" ON "order_feedback"("tenant_id", "customer_id");

ALTER TABLE "order_feedback" ADD CONSTRAINT "order_feedback_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_feedback" ADD CONSTRAINT "order_feedback_order_id_fkey" FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "order_feedback" ADD CONSTRAINT "order_feedback_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
