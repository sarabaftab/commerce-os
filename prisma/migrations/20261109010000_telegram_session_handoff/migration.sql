-- CreateTable
CREATE TABLE "telegram_session_handoffs" (
    "id" TEXT NOT NULL,
    "code_hash" TEXT NOT NULL,
    "session_token" TEXT NOT NULL,
    "expires_at" TIMESTAMP(3) NOT NULL,
    "consumed_at" TIMESTAMP(3),
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "telegram_session_handoffs_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE UNIQUE INDEX "telegram_session_handoffs_code_hash_key" ON "telegram_session_handoffs"("code_hash");

-- CreateIndex
CREATE INDEX "telegram_session_handoffs_expires_at_idx" ON "telegram_session_handoffs"("expires_at");
