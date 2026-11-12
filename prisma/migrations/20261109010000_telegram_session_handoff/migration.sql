-- AUD-003: telegram_session_handoffs already exists from
-- 20260925010000_telegram_session_handoff (tenant_id + session_id, no plaintext
-- session_token). Friend fork migration was a CREATE for an older shape — no-op here.
SELECT 1;
