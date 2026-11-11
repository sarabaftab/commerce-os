-- CreateTable
CREATE TABLE "telegram_session_handoffs" (
    "id" TEXT NOT NULL,
    "tenant_id" TEXT NOT NULL,
    "session_id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_session_handoffs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "telegram_session_handoffs_code_hash_key" ON "telegram_session_handoffs"("code_hash");
CREATE INDEX "telegram_session_handoffs_tenant_id_idx" ON "telegram_session_handoffs"("tenant_id");
CREATE INDEX "telegram_session_handoffs_expires_at_idx" ON "telegram_session_handoffs"("expires_at");

ALTER TABLE "telegram_session_handoffs" ADD CONSTRAINT "telegram_session_handoffs_tenant_id_fkey" FOREIGN KEY ("tenant_id") REFERENCES "tenants"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "telegram_session_handoffs" ADD CONSTRAINT "telegram_session_handoffs_session_id_fkey" FOREIGN KEY ("session_id") REFERENCES "customer_sessions"("id") ON DELETE CASCADE ON UPDATE CASCADE;
