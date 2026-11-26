-- Additive scheduling + reorder reminder tables. Reminders stay disabled by default.

CREATE TYPE "ScheduledJobRunStatus" AS ENUM ('running', 'completed', 'failed');

CREATE TYPE "ReorderReminderStatus" AS ENUM ('sent', 'failed', 'skipped');

ALTER TABLE "tenant_settings"
ADD COLUMN "reorder_reminders_enabled" BOOLEAN NOT NULL DEFAULT false;

ALTER TABLE "tenant_settings"
ADD COLUMN "reorder_reminder_interval_days" INTEGER NOT NULL DEFAULT 14;

CREATE TABLE "scheduled_job_runs" (
    "id" TEXT NOT NULL,
    "job_key" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "run_date_key" VARCHAR(10) NOT NULL,
    "status" "ScheduledJobRunStatus" NOT NULL DEFAULT 'running',
    "processed_count" INTEGER NOT NULL DEFAULT 0,
    "success_count" INTEGER NOT NULL DEFAULT 0,
    "failure_count" INTEGER NOT NULL DEFAULT 0,
    "skipped_count" INTEGER NOT NULL DEFAULT 0,
    "error_message" TEXT,
    "started_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "finished_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scheduled_job_runs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "scheduled_job_runs_job_key_tenant_id_run_date_key_key"
ON "scheduled_job_runs"("job_key", "tenant_id", "run_date_key");

CREATE INDEX "scheduled_job_runs_tenant_id_started_at_idx"
ON "scheduled_job_runs"("tenant_id", "started_at");

ALTER TABLE "scheduled_job_runs"
ADD CONSTRAINT "scheduled_job_runs_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

CREATE TABLE "reorder_reminders" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "source_order_id" TEXT NOT NULL,
    "job_run_id" TEXT,
    "status" "ReorderReminderStatus" NOT NULL,
    "error_code" VARCHAR(64),
    "sent_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "reorder_reminders_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "reorder_reminders_tenant_id_customer_id_sent_at_idx"
ON "reorder_reminders"("tenant_id", "customer_id", "sent_at");

CREATE INDEX "reorder_reminders_tenant_id_created_at_idx"
ON "reorder_reminders"("tenant_id", "created_at");

CREATE INDEX "reorder_reminders_job_run_id_idx"
ON "reorder_reminders"("job_run_id");

ALTER TABLE "reorder_reminders"
ADD CONSTRAINT "reorder_reminders_tenant_id_fkey"
FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reorder_reminders"
ADD CONSTRAINT "reorder_reminders_customer_id_fkey"
FOREIGN KEY ("customer_id") REFERENCES "customers"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reorder_reminders"
ADD CONSTRAINT "reorder_reminders_source_order_id_fkey"
FOREIGN KEY ("source_order_id") REFERENCES "orders"("id")
ON DELETE CASCADE ON UPDATE CASCADE;

ALTER TABLE "reorder_reminders"
ADD CONSTRAINT "reorder_reminders_job_run_id_fkey"
FOREIGN KEY ("job_run_id") REFERENCES "scheduled_job_runs"("id")
ON DELETE SET NULL ON UPDATE CASCADE;
