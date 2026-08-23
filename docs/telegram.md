# Telegram Mini App

CommerceOS exposes the existing tenant storefront (e.g. `/kin-a2`) as a Telegram Mini App. Telegram is a **channel adapter** around the same cart, checkout, orders, and settings — not a separate commerce system.

## BotFather setup (KIN A2)

1. Open [@BotFather](https://t.me/BotFather) → `/newbot` (or use an existing bot).
2. Copy the **bot token** into Vercel and `.env.local` as `TELEGRAM_BOT_TOKEN` (must be this bot, not another).
3. Set `TELEGRAM_TENANT_SLUG=kin-a2` (must match the storefront URL slug).
4. Configure the Mini App:
   - BotFather → your bot → **Bot Settings** → **Menu Button** / **Configure Mini App**
   - Web App URL must be the **production** shop, including the slug, for example `https://<your-vercel-host>/kin-a2`
   - The host must be the same URL customers open in Telegram (not a Vercel preview URL, not localhost)
   - Testers do not need any extra Telegram app setting. If Account fails only for them, it is a session cookie issue in the Mini App WebView, not a Telegram privacy toggle.
5. Optional deep link: `https://t.me/<bot>?startapp=<opaque_param>` — `start_param` is stored as order `referralCode` (no referral logic yet).

## Local HTTPS

Telegram requires HTTPS for Mini Apps.

- Use a tunnel (Cloudflare Tunnel, ngrok, etc.) pointed at `http://127.0.0.1:3000`.
- Set `NEXT_PUBLIC_APP_URL` to the HTTPS tunnel URL.
- For cookie auth inside Telegram’s WebView, production uses `SameSite=Lax; Secure` (same as the cart cookie). Set `TELEGRAM_FORCE_SECURE_COOKIES=1` only for HTTPS tunnels where the Mini App origin is not the shop origin (`SameSite=None; Secure`).

## Env vars

| Variable | Purpose |
|----------|---------|
| `TELEGRAM_BOT_TOKEN` | BotFather token (HMAC secret for `initData`) |
| `TELEGRAM_TENANT_SLUG` | Only this slug may use the bot token (Phase 1) |
| `TELEGRAM_INIT_DATA_MAX_AGE_SECONDS` | Max age of `auth_date` (default `300`) |
| `CUSTOMER_SESSION_TTL_SECONDS` | Customer session lifetime (default 30 days) |
| `TELEGRAM_FORCE_SECURE_COOKIES` | `1` = `SameSite=None; Secure` (HTTPS tunnels only; production Mini App uses Lax) |

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

## Order status notifications

When an admin changes order status (after `pending`), CommerceOS sends a Telegram message to the customer’s linked Telegram user id (`CustomerIdentity.externalId`).

Requirements:

- The customer must have opened this shop from **this** bot (menu button / Mini App). Telegram will 403 if they never started the bot.
- `TELEGRAM_BOT_TOKEN` must be set on **Vercel Production** (same BotFather token as Mini App HMAC). A Telegram **401** means that token was rejected. Mini App login can still work locally while Production send fails if the Vercel var is missing or different. After changing it, redeploy, then Retry on the order.
- Storage bucket for payment proofs is unrelated.

View Order opens `/{tenantSlug}/account/orders/{orderNumber}` inside the Mini App. That route still requires a customer session. The existing Account cookie issue is unchanged; we do not use a public order URL.

Admin order detail shows Telegram Sent / Failed / Not linked, with Retry for failed/pending rows. Duplicate transitions for the same status do not send a second message.

## Out of scope (Phase 1)

Loyalty, referrals engine, Stars payments, WhatsApp/LINE, multi-bot multi-tenant mapping.
