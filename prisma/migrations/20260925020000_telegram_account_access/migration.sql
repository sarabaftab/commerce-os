-- CreateTable
CREATE TABLE "telegram_account_accesses" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "customer_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_account_accesses_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_account_accesses_code_hash_key" ON "telegram_account_accesses"("code_hash");
CREATE INDEX "telegram_account_accesses_tenant_id_customer_id_idx" ON "telegram_account_accesses"("tenant_id", "customer_id");
CREATE INDEX "telegram_account_accesses_expires_at_idx" ON "telegram_account_accesses"("expires_at");

ALTER TABLE "telegram_account_accesses" ADD CONSTRAINT "telegram_account_accesses_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_account_accesses" ADD CONSTRAINT "telegram_account_accesses_customer_id_fkey" FOREIGN KEY ("customer_id") REFERENCES "customers"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_account_accesses" ADD CONSTRAINT "telegram_account_accesses_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "customer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
