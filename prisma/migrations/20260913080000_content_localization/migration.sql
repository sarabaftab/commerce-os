-- Optional customer-facing localization fields (EN remains canonical).
-- Nullable translations; existing English rows need no backfill.

ALTER TABLE "products"
  ADD COLUMN IF NOT EXISTS "name_km" TEXT,
  ADD COLUMN IF NOT EXISTS "name_zh" TEXT,
  ADD COLUMN IF NOT EXISTS "description_km" TEXT,
  ADD COLUMN IF NOT EXISTS "description_zh" TEXT;

ALTER TABLE "categories"
  ADD COLUMN IF NOT EXISTS "name_km" TEXT,
  ADD COLUMN IF NOT EXISTS "name_zh" TEXT;

ALTER TABLE "faqs"
  ADD COLUMN IF NOT EXISTS "question_zh" TEXT,
  ADD COLUMN IF NOT EXISTS "answer_zh" TEXT;

-- Snapshot of customer UI locale at checkout for Telegram notifications.
ALTER TABLE "orders"
  ADD COLUMN IF NOT EXISTS "customer_locale" VARCHAR(8);
