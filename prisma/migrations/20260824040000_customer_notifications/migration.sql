CREATE TYPE "NotificationChannel" AS ENUM ('telegram');
CREATE TYPE "NotificationType" AS ENUM ('order_status');
CREATE TYPE "NotificationDeliveryStatus" AS ENUM ('pending', 'sent', 'failed');

ALTER TABLE "tenant_settings"
  ADD COLUMN "telegram_order_notifications_enabled" BOOLEAN NOT NULL DEFAULT true;

CREATE TABLE "customer_notifications" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "order_id" TEXT NOT NULL,
    "channel" "NotificationChannel" NOT NULL,
    "type" "NotificationType" NOT NULL,
    "to_status" "OrderStatus" NOT NULL,
    "recipient_external_id" TEXT,
    "status" "NotificationDeliveryStatus" NOT NULL DEFAULT 'pending',
    "attempt_count" INTEGER NOT NULL DEFAULT 0,
    "last_attempt_at" TIMESTAMP(3),
    "sent_at" TIMESTAMP(3),
    "error_code" VARCHAR(64),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "customer_notifications_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "customer_notifications_order_id_channel_type_to_status_key"
  ON "customer_notifications"("order_id", "channel", "type", "to_status");
CREATE INDEX "customer_notifications_tenant_id_order_id_idx"
  ON "customer_notifications"("tenant_id", "order_id");
CREATE INDEX "customer_notifications_tenant_id_status_idx"
  ON "customer_notifications"("tenant_id", "status");

ALTER TABLE "customer_notifications"
  ADD CONSTRAINT "customer_notifications_tenant_id_fkey"
  FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_notifications"
  ADD CONSTRAINT "customer_notifications_customer_id_fkey"
  FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "customer_notifications"
  ADD CONSTRAINT "customer_notifications_order_id_fkey"
  FOREIGN KEY ("order_id") REFERENCES "orders"("id") ON DELETE CASCADE ON UPDATE CASCADE;
