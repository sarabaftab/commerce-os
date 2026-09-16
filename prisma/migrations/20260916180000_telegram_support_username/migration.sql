-- Optional public Telegram support username for FAQ human fallback (additive).

ALTER TABLE "tenant_settings" ADD COLUMN IF NOT EXISTS "telegram_support_username" TEXT;
