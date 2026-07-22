# Telegram Mini App

CommerceOS exposes the existing tenant storefront (e.g. `/kin-a2`) as a Telegram Mini App. Telegram is a **channel adapter** around the same cart, checkout, orders, and settings — not a separate commerce system.

## BotFather setup (KIN A2)

1. Open [@BotFather](https://t.me/BotFather) → `/newbot` (or use an existing bot).
2. Copy the **bot token** into `.env.local` as `TELEGRAM_BOT_TOKEN`.
3. Set `TELEGRAM_TENANT_SLUG=kin-a2` (must match the storefront URL slug).
4. Configure the Mini App:
   - `/newapp` or Bot settings → **Menu Button** / **Web App**
   - Web App URL: `https://<your-public-host>/kin-a2`
5. Optional deep link: `https://t.me/<bot>?startapp=<opaque_param>` — `start_param` is stored as order `referralCode` (no referral logic yet).

## Local HTTPS

Telegram requires HTTPS for Mini Apps.

- Use a tunnel (Cloudflare Tunnel, ngrok, etc.) pointed at `http://127.0.0.1:3000`.
- Set `NEXT_PUBLIC_APP_URL` to the HTTPS tunnel URL.
- For cookie auth inside Telegram’s WebView, set `TELEGRAM_FORCE_SECURE_COOKIES=1` so customer session cookies use `SameSite=None; Secure`.

## Env vars

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | BotFather token (HMAC secret for `initData`) |
| `TELEGRAM_TENANT_SLUG` | Only this slug may use the bot token (Phase 1) |
| `TELEGRAM_INIT_DATA_MAX_AGE_SECONDS` | Max age of `auth_date` (default `300`) |
| `CUSTOMER_SESSION_TTL_SECONDS` | Customer session lifetime (default 30 days) |
| `TELEGRAM_FORCE_SECURE_COOKIES` | `1` = `SameSite=None; Secure` in non-production |

## Auth flow

1. Client loads `telegram-web-app.js`, calls `WebApp.ready()` / `expand()`.
2. `POST /api/v1/:tenantSlug/telegram/auth` with raw `initData`.
3. Server validates HMAC + `auth_date`, upserts `CustomerIdentity(channel=telegram)`, creates `CustomerSession`, sets HttpOnly cookie.
4. Guest cart lines merge into the customer cart; guest cart is abandoned.
5. Checkout uses `channel: "telegram"` and may prefill the display name.

## Manual checklist

- [ ] Open Mini App from Telegram — theme colors apply, viewport expands
- [ ] Auth succeeds (no “Invalid Telegram init data”)
- [ ] Cart persists across navigation after auth
- [ ] Guest items added before auth appear after auth
- [ ] Checkout order has `channel = telegram`
- [ ] `startapp` param lands on order as `referralCode`
- [ ] BackButton shows on nested routes, hidden on store root
- [ ] Web storefront still works without Telegram (auth skipped)

## Out of scope (Phase 1)

Loyalty, referrals engine, Telegram order notifications, Stars payments, WhatsApp/LINE, multi-bot multi-tenant mapping.
