# Project audit report

Audit date: 2026-10-30. Repository: `commerce-os` at `/Users/nipun/sarab`, branch `main`, commit `a2a8975`. This is a static review plus local test commands. No source files were changed. No live Supabase, Telegram, or Photon requests were made.

## 1. Executive summary

**Overall readiness: Not ready**

This is a working multi-tenant commerce app (storefront, guest checkout, admin, Telegram Mini App), not the AI website generator described in `PROJECT_AUDIT_PROMPT.md`. The application code has real authorization on the paths that were traced, money is stored as integer minor units, and the existing unit suite passes. It is not ready for real customer orders until the database API exposure is proven closed and the confirmed customer-identity bugs below are fixed.

**Key strengths**

- Admin routes use Supabase `getUser()` plus a tenant membership lookup. The service-role key is read only in server storage modules.
- Telegram Mini App `initData` is HMAC-validated with an expiry check. Customer session cookies are `HttpOnly`, and the stored value is a SHA-256 hash.
- Checkout prices come from the cart and tenant settings, not from the client. Orders are unique per `(tenantId, idempotencyKey)`. Payment-proof uploads check PNG/JPEG/WEBP signatures and a 5 MB cap.
- Product descriptions render as React text, so they are escaped. There is no `dangerouslySetInnerHTML`.
- `npm test` (230 tests), `tsc --noEmit`, and `eslint .` all passed locally.

**Top 3 risks**

1. The repo never enables Postgres row-level security or revokes Supabase Data API grants. If the hosted project still exposes `public`, the public anon key can read and write tables outside this app. Live exposure was not tested.
2. Guest checkout that matches an existing phone overwrites that customer's display name and can set their email.
3. A long-lived customer session token is placed in a URL query parameter during Telegram account linking.

**Confidence:** medium. High for the code paths read in this pass. Low for hosted Supabase Auth settings, storage bucket privacy, and production `NODE_ENV`, which are not in git.

## 2. What I inspected

### What is actually implemented

The prompt's project context does not match this repository.

| Prompt assumption | What the code is |
| --- | --- |
| AI website generator, `WebsiteConfig`, `SiteRenderer` | Absent. No AI calls, no site-section catalog. |
| FastAPI / Pydantic backend | Absent. One Next.js 15 App Router app. |
| Owners publish websites; visitors view them | Shoppers browse a tenant storefront, use a cart, and check out. Staff use `/admin`. |
| Vercel + Render + Cloudflare | `vercel.json` sets the Next.js framework only. No Render or Cloudflare config. |

Implemented capabilities:

- Next.js 15.5.20, React 19, TypeScript, Tailwind 4, Prisma 6.19.3, Zod 4.4.3, Supabase Auth (`@supabase/ssr`).
- Postgres via Prisma (`DATABASE_URL` / `DIRECT_URL`). Migrations live in `prisma/migrations/`.
- Public storefront at `/[tenantSlug]`, cart and guest checkout, order confirmation, customer account, FAQ, admin catalog/orders/customers/settings/broadcasts.
- Telegram Mini App auth, customer sessions, and channel broadcasts.
- Payment methods in schema: cash on delivery and ABA transfer, with a screenshot upload.
- Seed tenant slug `kin-a2`.

Not implemented: loyalty, referrals engine, SaaS billing, tenant self-signup, account deletion, AI generation, website publishing.

### Request flow that was traced

1. Admin sign-in: browser Supabase client on `/admin/login` → cookie session → `middleware.ts` calls `supabase.auth.getUser()` for `/admin/*` → `resolveAdminSession` loads `userTenantMembership` by `supabaseUserId` → server actions call `requireAdminSession()` and pass `session.tenantId` into services.
2. Storefront: `/[tenantSlug]` resolves an active tenant by slug. Catalog reads are public. Cart identity is an `HttpOnly` guest cookie or a customer session.
3. Checkout: `POST /api/v1/[tenantSlug]/checkout` validates Zod input, reloads the cart from the database, computes totals, writes the order in a Prisma transaction.
4. Order read: `GET /api/v1/[tenantSlug]/orders/[orderNumber]` requires a confirmation token or the owning customer session.
5. Telegram: `POST /api/v1/[tenantSlug]/telegram/auth` checks `initData` against `TELEGRAM_BOT_TOKEN` and only for `TELEGRAM_TENANT_SLUG`. A new session token is set as a cookie. The account form also redirects through `tg_s`.
6. Media: product images and ABA QR images go to a public Supabase bucket via the service-role client. Payment proofs go to a separate bucket and are downloaded only by an authenticated admin route.

Trust boundary: the browser holds the anon key and cookies. The Next.js server holds `DATABASE_URL` and the service-role key and is the only intended writer. Prisma connects as the database user, which bypasses row-level security even if policies are added later. The Supabase Data API is a second door to the same tables and is not controlled by this app's route checks.

### Audited paths

`src/middleware.ts`, `src/shared/auth/`, `src/shared/config/env.ts`, `src/shared/http/json.ts`, `src/shared/db/prisma.ts`, `src/shared/orders/confirmation-cookie.ts`, `src/shared/storage/`, `src/channels/telegram/server/`, `src/modules/identity/services/admin-auth-service.ts`, `src/modules/customers/repositories/customer-repository.ts`, `src/modules/orders/services/checkout-service.ts`, `src/modules/orders/services/payment-proof-service.ts`, `src/app/api/**`, `prisma/schema.prisma`, `prisma/migrations/20260715100000_init/migration.sql`, `next.config.ts`, `vercel.json`, `.gitignore`, `.env.example`, `docs/setup.md`, `package.json`.

### Commands executed

| Command | Result |
| --- | --- |
| `npm test` | Pass. Vitest 4.1.10, 33 files, 230 tests, about 2.5s. |
| `npx tsc --noEmit` | Pass, exit 0. |
| `npx eslint . --max-warnings 0` | Pass, exit 0. |
| `npm audit` | 2 critical, 19 high, 7 moderate, 1 low (828 dependencies in the audit metadata). |
| `git ls-files` for env files | Only `.env.example` is tracked. |

Not run: `npm run build`, `npm run format:check`, Prisma migrate, seed, browser passes, and any request to Supabase, Telegram, or Photon. Local `.env` / `.env.local` still contain the example placeholders, so a database-backed run was not possible. `npm install` was not run for this audit; `node_modules` was already present.

### Inaccessible areas

Hosted Supabase Auth (email confirmation, sign-up, leaked-password protection), Data API and RLS settings in the dashboard, storage bucket policies, Vercel environment values, and production `NODE_ENV`.

## 3. Security audit checklist

| Area | Status | Evidence | Notes |
| --- | --- | --- | --- |
| Auth and authorization | Finding | `src/modules/identity/services/admin-auth-service.ts`, `src/channels/telegram/server/session-form.ts`, `src/modules/customers/repositories/customer-repository.ts` | App-level admin and customer checks exist. Email-link login, phone merge, and the Telegram URL handoff are findings below. |
| Supabase and data | Needs verification | `prisma/migrations/20260715100000_init/migration.sql`; no `ENABLE ROW LEVEL SECURITY` anywhere in the repo | Prisma is the app's authorization layer. The public anon key can still reach PostgREST if the Data API is on. Not tested against the hosted project. |
| WebsiteConfig trust | N/A | No `WebsiteConfig`, Pydantic, or Python schema | This app validates commerce input with Zod. |
| Injection and frontend safety | Pass | No `dangerouslySetInnerHTML`. Product description is a text child in `src/app/(storefront)/[tenantSlug]/products/[productSlug]/page.tsx`. `safeTelegramAccountPath` rejects protocol-relative redirects. | Admin `next` must start with `/admin` (`src/app/(admin)/admin/login/page.tsx`). |
| Media uploads and storage | Finding | `src/shared/storage/payment-proof-storage.ts`, `src/shared/storage/product-image-storage.ts`, `next.config.ts` | Magic-byte checks and size limits are in place. Product bucket is forced public. Payment-proof bucket privacy is not defined in git. Image optimizer allows any host. |
| API protections | Finding | `src/app/api/v1/[tenantSlug]/checkout/route.ts`, `src/app/api/location/search/route.ts` | Consistent `{ data }` / `{ error: { code, message } }` envelope. No rate limits. No custom CORS headers (same-origin by default). |
| Secrets and configuration | Pass | `.gitignore` ignores `.env` and `.env.local`. `git ls-files` shows only `.env.example`. Service role is not imported from a client module. | `DATABASE_URL` is only `z.string().min(1)`, so a placeholder URL fails later inside Prisma. |
| Dependencies and supply chain | Finding | `package-lock.json` present. `npm audit` on 2026-10-30. No `.github/workflows`. | Direct `next@15.5.20` and `zod@4.4.3` are inside ranges npm audit flags. |
| Deployment security | Finding | `next.config.ts`, `vercel.json` | No security headers in app code. `images.remotePatterns` includes `hostname: "**"`. |
| Privacy and abuse | Finding | `upsertCustomerByPhone`; no account-deletion code | Guest checkout can rewrite another customer's profile. No retention or deletion flow. |
| AI-specific risks | N/A | No model client, prompt, or generated-code path | Future note in section 11. |

## 4. Findings by priority

| ID | Priority | Finding | Status | Affected file(s) | Effort | Order |
| --- | --- | --- | --- | --- | --- | --- |
| AUD-001 | P0 | Supabase Data API may expose Prisma tables; repo has no RLS or grant revocation | Needs verification | `prisma/migrations/20260715100000_init/migration.sql` | S | 1 |
| AUD-002 | P1 | Guest checkout overwrites an existing customer matched by phone | Confirmed | `src/modules/customers/repositories/customer-repository.ts` | S | 2 |
| AUD-003 | P1 | Long-lived customer session token is put in the `tg_s` URL | Confirmed | `src/channels/telegram/server/session-handoff.ts`, `session-form.ts` | M | 3 |
| AUD-004 | P1 | Admin email linking is on whenever `NODE_ENV` is not `production` | Confirmed | `src/modules/identity/services/admin-auth-service.ts` | S | 4 |
| AUD-005 | P1 | Installed `next` and `zod` are in ranges flagged by npm audit | Confirmed | `package.json` | S | 5 |
| AUD-006 | P2 | Order confirmation tokens are stored in plaintext and accepted from the query string | Confirmed | `prisma/schema.prisma`, `src/shared/orders/confirmation-cookie.ts` | M | 6 |
| AUD-007 | P2 | Idempotency replay is not bound to the caller | Confirmed | `src/modules/orders/services/checkout-service.ts` | S | 7 |
| AUD-008 | P2 | No rate limits on checkout, location search, or Telegram auth | Confirmed | `src/app/api/v1/`, `src/app/api/location/search/route.ts` | M | 8 |
| AUD-009 | P2 | No security headers; Next image optimizer allows any remote host | Confirmed | `next.config.ts` | S | 9 |
| AUD-010 | P2 | `owner` / `admin` / `staff` are stored and not enforced | Confirmed | `src/modules/identity/services/admin-auth-service.ts`, `src/ui/admin/admin-shell.tsx` | M | 10 |
| AUD-011 | P2 | Payment-proof bucket privacy is not defined in the repo | Needs verification | `src/shared/storage/payment-proof-storage.ts` | S | 11 |
| AUD-012 | P2 | No CI workflow | Confirmed | repository root | S | 12 |
| AUD-013 | P3 | Health check ignores the database; env URL check is weak; setup docs are stale | Confirmed | `src/app/api/v1/health/route.ts`, `src/shared/config/env.ts`, `docs/setup.md` | S | 13 |

## 5. Detailed findings

#### AUD-001 — Database tables may be reachable with the public anon key

- **Priority:** P0
- **Status:** Needs verification
- **Category:** Data
- **Evidence:** `prisma/migrations/20260715100000_init/migration.sql` creates `tenants`, `users`, `orders`, and the other tables in schema `public`. A search of the repo finds no `ENABLE ROW LEVEL SECURITY` and no `REVOKE` from `anon` or `authenticated`. `NEXT_PUBLIC_SUPABASE_ANON_KEY` is a client env var (`.env.example`). Prisma uses `DATABASE_URL` (`prisma/schema.prisma` lines 5–8), which is a database role and bypasses RLS.
- **Observed behavior:** Authorization that was traced (admin membership, cart cookie, confirmation token, customer session) is enforced in Next.js. Nothing in git turns off the Supabase Data API for those tables.
- **Risk / user impact:** If the hosted project still exposes `public` through PostgREST, anyone who can read the anon key from the browser bundle can query or modify customers, orders, and sessions without going through this app. Likelihood depends on dashboard settings that were not inspected. Severity is full data exposure if the API is enabled. This was not tested against the live project.
- **Recommended minimal fix:** In the Supabase SQL editor, revoke `anon` and `authenticated` privileges on these tables and enable RLS with no policies for those roles (or disable the Data API for `public`). Commit that SQL as a migration so a new environment cannot forget it. Keep Prisma on the database role. Then, from a machine that is allowed to see only the anon key, confirm `GET /rest/v1/orders` returns 401 or an empty permission error.
- **How to verify:** After the SQL change, the storefront and admin still work through the Next.js server, and the anon key cannot select from `orders` or `customers`.
- **Estimated effort:** S
- **Dependencies / tradeoffs:** Do this before real orders. RLS on the Prisma role is unnecessary and will break the app if the migration user is not the table owner.

#### AUD-002 — Guest checkout rewrites an existing customer

- **Priority:** P1
- **Status:** Confirmed
- **Category:** Authorization
- **Evidence:** `upsertCustomerByPhone` in `src/modules/customers/repositories/customer-repository.ts` lines 108–116. `placeGuestOrder` calls it for a checkout with no `customerId` (`src/modules/orders/services/checkout-service.ts` around lines 315–321).
- **Observed behavior:** If the phone matches a tenant customer, the transaction updates that row's `displayName` and, when the existing email is empty, sets `email`. The new order is attached to that customer id. An authenticated customer update path (`updateCustomerContact`) deliberately does not merge into another phone.
- **Risk / user impact:** Anyone who can check out and knows a customer's phone number can rename that account, attach an order and delivery address to it, and fill an empty email. They do not receive that customer's session, so this is profile takeover rather than a full login bypass. Likelihood is high on a public storefront. The matched customer then sees the stranger's order in their history.
- **Recommended minimal fix:** On a phone match during guest checkout, do not update `displayName` or `email`. Attach the order only if that is the intended business rule, or create a separate guest customer and let staff merge it. Reserve profile edits for `requireCustomerSession`.
- **How to verify:** Place a guest order with an existing customer's phone and a different name. The stored `displayName` stays unchanged. The guest receives confirmation only for the new order.
- **Estimated effort:** S
- **Dependencies / tradeoffs:** Staff may currently rely on phone match to keep one customer record. Keep the match for linking the order, and stop the profile write.

#### AUD-003 — Customer session token is placed in the URL

- **Priority:** P1
- **Status:** Confirmed
- **Category:** Auth
- **Evidence:** `createTelegramSessionHandoff` in `src/channels/telegram/server/session-handoff.ts` lines 55–59 builds `` `${exp}.${sessionToken}.${sig}` ``. `handleTelegramSessionFormPost` in `src/channels/telegram/server/session-form.ts` lines 69–74 puts that value in `tg_s` and returns HTML that navigates to it. `handoffSecret()` (line 4) uses `TELEGRAM_BOT_TOKEN`, then `DATABASE_URL`, then the fixed string `commerceos-tg-handoff`. Session TTL defaults to 30 days (`src/shared/config/env.ts` lines 19–23). The wrapper itself expires in 120 seconds.
- **Observed behavior:** Middleware reads `tg_s`, checks the HMAC, and sets the `commerceos_customer` cookie. The session token is still inside the query string in plaintext. The cookie is also set on the HTML response. The HMAC secret falls back to a constant if both env vars are missing.
- **Risk / user impact:** The URL can land in access logs, browser history, and the HTML body. After the 120-second wrapper expires, the extracted token still works as the cookie until the session row expires (default 30 days). Capturing that URL steals the customer account. The hardcoded secret does not mint sessions by itself; it only makes a captured token easier to re-wrap if the env fallback is in use.
- **Recommended minimal fix:** Store a random one-time code server-side (hashed, 2-minute TTL, single use). Put only that code in the URL. Exchange it in middleware for the existing cookie. Delete `commerceos-tg-handoff`. Keep using the cookie the form response already sets when the WebView accepts it.
- **How to verify:** Complete Telegram account linking. The address bar and the HTML response contain no session token. Replaying the code a second time does not set a cookie.
- **Estimated effort:** M
- **Dependencies / tradeoffs:** Needed for Telegram WebViews that drop the first `Set-Cookie`. A one-time code preserves that workaround.

#### AUD-004 — Non-production NODE_ENV links the first admin by email

- **Priority:** P1
- **Status:** Confirmed
- **Category:** Authorization
- **Evidence:** `resolveAdminSession` in `src/modules/identity/services/admin-auth-service.ts` lines 29–49. Email link runs when `ALLOW_ADMIN_EMAIL_LINK=1` or `NODE_ENV !== "production"`. `src/shared/db/prisma.ts` lines 24–26 notes that Vercel project env sometimes sets `NODE_ENV` to `development`.
- **Observed behavior:** If no membership exists for the Supabase user id, and the flag above is true, the first user row with that email and a null `supabaseUserId` is linked to the caller and granted that membership.
- **Risk / user impact:** On any deploy that is not exactly `NODE_ENV=production`, a person who can sign in to Supabase as the seeded admin email becomes the shop admin, as long as `supabaseUserId` is still null. Whether Supabase allows that sign-in (open sign-up, no email confirmation) was not verified. The code path itself is unconditional outside production.
- **Recommended minimal fix:** Link only when `ALLOW_ADMIN_EMAIL_LINK=1`, including in local dev. Set `SEED_ADMIN_SUPABASE_USER_ID` before seed. Refuse to boot production if the flag is set. Confirm Supabase email sign-up requires confirmation and that public sign-up is off if only one admin is intended.
- **How to verify:** With `NODE_ENV=development` and the flag unset, a Supabase user whose email matches an unlinked seed user gets "No admin account found" instead of a membership.
- **Estimated effort:** S
- **Dependencies / tradeoffs:** Local seed must set the Supabase user id, or the developer sets the flag on purpose.

#### AUD-005 — npm audit flags the installed Next.js and Zod versions

- **Priority:** P1
- **Status:** Confirmed
- **Category:** Supply chain
- **Evidence:** `npm ls` shows `next@15.5.20` and `zod@4.4.3`. `npm audit` on 2026-10-30 reported a critical advisory whose range includes this Next.js release ("Denial of Service in App Router using Server Actions") and a high advisory for Zod below 4.6.6 (memory exhaustion while validating oversized collections). Totals: 2 critical, 19 high, 7 moderate, 1 low. Many high findings are transitive (`prisma`, `shadcn`, `vite`, `vitest`, `postcss`).
- **Observed behavior:** The app uses Server Actions for checkout and admin writes, and Zod for request bodies. This audit did not reproduce the advisories.
- **Risk / user impact:** The Next.js finding is an availability risk on Server Actions, which this app uses for checkout and uploads. The Zod finding is an availability risk on large inputs. These are not, by themselves, shown here to be data-exposure bugs.
- **Recommended minimal fix:** Upgrade `next` and `zod` to versions outside the flagged ranges, then re-run `npm test`, `tsc --noEmit`, and a checkout smoke test. Re-run `npm audit` and triage what remains in direct dependencies. Do not run `npm audit fix --force`.
- **How to verify:** `npm ls next zod` shows patched versions and `npm audit` no longer lists those two direct advisories.
- **Estimated effort:** S
- **Dependencies / tradeoffs:** A Next.js bump can change Server Action behavior. Run the existing unit tests and one manual checkout afterward.

#### AUD-006 — Confirmation tokens are stored and transported in plaintext

- **Priority:** P2
- **Status:** Confirmed
- **Category:** Auth
- **Evidence:** `Order.confirmationToken` is a unique plaintext column (`prisma/schema.prisma` line 337). `readOrderConfirmationTokenFromRequest` accepts `?token=` before the cookie (`src/shared/orders/confirmation-cookie.ts` lines 101–108). `confirmationTokensMatch` is only referenced from `tests/unit/order-confirmation-access.test.ts`. Lookup uses SQL equality in `findOrderByConfirmationToken`.
- **Observed behavior:** Possession of the token plus the order number returns the order. The token is a 32-byte random value, so guessing is not practical. It can appear in URLs, logs, and a database dump. Customer session tokens, by contrast, are stored as SHA-256 hashes.
- **Risk / user impact:** A leaked URL or database backup discloses the guest's order (name, phone, address). Likelihood is moderate if confirmation links are copied or logged.
- **Recommended minimal fix:** Store only a hash, compare with the existing hash helper, and accept the secret only from the `HttpOnly` cookie. Drop the query parameter.
- **How to verify:** `GET /api/v1/kin-a2/orders/ORD-1?token=...` does not authorize. A database read of the order row does not contain the raw token.
- **Estimated effort:** M
- **Dependencies / tradeoffs:** Existing confirmation links in the wild would stop working. Acceptable before real customers.

#### AUD-007 — Knowing an idempotency key returns that order

- **Priority:** P2
- **Status:** Confirmed
- **Category:** Authorization
- **Evidence:** `placeGuestOrder` returns the existing order when `findOrderByIdempotencyKey` hits, before it checks the caller's cart (`src/modules/orders/services/checkout-service.ts` lines 244–250). The checkout route strips `confirmationToken` from JSON and, when present, sets the confirmation cookie.
- **Observed behavior:** The key is a UUID created in `getCheckoutPreview`. It is not guessable. It is not bound to the cart or customer. A caller who already has the UUID receives that order and the confirmation cookie.
- **Risk / user impact:** Low if keys stay on the checkout page of the buyer. Higher if they are logged, emailed, or left in analytics. Impact is disclosure of that order.
- **Recommended minimal fix:** On replay, also require the same guest cart token or customer id stored on the order. If the caller does not match, return the existing success only to the original cookie holder.
- **How to verify:** A second browser that posts the same idempotency key and a different cart cookie gets 404 or 409, not the order body.
- **Estimated effort:** S
- **Dependencies / tradeoffs:** Honest double-submits from the same browser must still return the original order.

#### AUD-008 — Public write and proxy endpoints have no rate limit

- **Priority:** P2
- **Status:** Confirmed
- **Category:** Abuse
- **Evidence:** Checkout (`src/app/api/v1/[tenantSlug]/checkout/route.ts`), Telegram auth (`src/app/api/v1/[tenantSlug]/telegram/auth/route.ts`), and location search (`src/app/api/location/search/route.ts`) have no limiter. A repo search finds no rate-limit module. Location search forwards the query to `PHOTON_BASE_URL` with a 5-second timeout (`src/modules/locations/services/location-search-service.ts`).
- **Observed behavior:** Each checkout attempt can open a Prisma transaction. Each location query calls Photon. Telegram auth can create customer rows for any valid `initData`.
- **Risk / user impact:** A script can fill the session-mode pool (the app's own docs say the Supabase pool size is 15), run up Photon traffic, or create customers. This is availability abuse, not a bypass of HMAC checks. The Photon URL comes from env, not from the user, so this is not an open internal SSRF.
- **Recommended minimal fix:** Add a small in-memory or Postgres counter: per IP on location search, per cart cookie on checkout, per Telegram user id on auth. Return 429. Keep the existing query length cap (2–120 characters).
- **How to verify:** The 31st location search from one IP in a minute returns 429. A normal checkout still returns 201.
- **Estimated effort:** M
- **Dependencies / tradeoffs:** In-memory limits reset per serverless instance. That is still useful. A shared table is the next step if abuse continues.

#### AUD-009 — Security headers are absent, and the image optimizer allows any host

- **Priority:** P2
- **Status:** Confirmed
- **Category:** Deployment
- **Evidence:** `next.config.ts` lines 25–33 set `images.remotePatterns` to `hostname: "**"` for HTTPS, plus localhost HTTP. No `headers()` config and no Content-Security-Policy, `X-Frame-Options`, or `Referrer-Policy` were found. `ProductImage` sends any `http:` or `https:` URL through `next/image` (`src/ui/storefront/product-image.tsx` lines 17–18). Product `mediaUrl` is `z.string().url()` (`src/modules/catalog/schemas/product.ts` line 27), which accepts any scheme the URL parser accepts.
- **Observed behavior:** An admin can save an arbitrary image URL. The Next.js optimizer will fetch it. Unusual schemes fall back to a raw `<img>`. Framing and referrer policy are left to platform defaults.
- **Risk / user impact:** The optimizer fetch is an admin-triggered server request to any host, including addresses that are not the shop CDN. Public shoppers cannot set the URL. Clickjacking of the admin UI is possible where the host does not send `X-Frame-Options`. Moderate severity, limited to trusted admins for the image part.
- **Recommended minimal fix:** Restrict `remotePatterns` to `**.supabase.co` (and any CDN you actually use). Reject product media URLs that are not `https`. Add a headers block: `X-Frame-Options: DENY`, `Referrer-Policy: no-referrer`, `X-Content-Type-Options: nosniff`.
- **How to verify:** A product saved with `http://127.0.0.1/` or a non-Supabase host is rejected. Response headers on `/admin` include the three headers above.
- **Estimated effort:** S
- **Dependencies / tradeoffs:** Existing hotlinked product images on other hosts will break until re-uploaded.

#### AUD-010 — Staff and owner have the same powers

- **Priority:** P2
- **Status:** Confirmed
- **Category:** Authorization
- **Evidence:** `MembershipRole` is `owner | admin | staff` (`prisma/schema.prisma`). `resolveAdminSession` returns `membership.role` and does not branch on it. `src/ui/admin/admin-shell.tsx` only displays the role. Every admin server action inspected calls `requireAdminSession()` and then uses `session.tenantId`.
- **Observed behavior:** Any membership can edit products, change settings, verify payment proofs, and publish Telegram broadcasts.
- **Risk / user impact:** A staff login is a full shop admin. Fine for a single operator. Misleading once a second person is invited.
- **Recommended minimal fix:** Until you need staff, stop inviting extra users. When you do, gate settings, broadcasts, and payment verification with `role === "owner" || role === "admin"`.
- **How to verify:** A membership with role `staff` can view orders and cannot open settings or broadcasts.
- **Estimated effort:** M
- **Dependencies / tradeoffs:** Skip this until a second human needs a login. Do not build a custom permission matrix.

#### AUD-011 — Payment-proof bucket privacy is not in the repo

- **Priority:** P2
- **Status:** Needs verification
- **Category:** Data
- **Evidence:** `uploadPaymentProofObject` uploads to bucket `payment-proofs` with the service role and does not set `public` (`src/shared/storage/payment-proof-storage.ts`). Admin download checks `isTrustedPaymentProofPath` and a tenant-scoped order. Product images explicitly call `updateBucket(..., { public: true })` for `tenant-assets`.
- **Observed behavior:** Proof bytes are validated and the object path is `{tenantId}/{orderId}/{random}.{ext}`. Whether that bucket is public is a dashboard setting.
- **Risk / user impact:** If the bucket is public, anyone who learns or guesses the path can download a transfer screenshot. The random 16-byte name makes guessing hard. A leaked path or a public listing would expose payment images.
- **Recommended minimal fix:** In Supabase Storage, set `payment-proofs` to private and confirm there is no public policy. Do not add a `getPublicUrl` call for proofs.
- **How to verify:** Opening the object URL without the service role returns 400 or 403. The admin payment-proof route still returns the image when signed in.
- **Estimated effort:** S
- **Dependencies / tradeoffs:** None for the app if downloads already go through the admin route.

#### AUD-012 — Nothing runs tests before a deploy

- **Priority:** P2
- **Status:** Confirmed
- **Category:** Reliability
- **Evidence:** No `.github/workflows` directory. `vercel.json` only sets `"framework": "nextjs"`. `package.json` already has `lint`, `typecheck`, `test`, and `format:check`.
- **Observed behavior:** A push can deploy through Vercel without the unit suite. Those commands passed when run by hand during this audit.
- **Risk / user impact:** A broken checkout or auth change can reach the hosted shop. This is process risk, not a current code bug.
- **Recommended minimal fix:** One GitHub Actions workflow on pull requests: `npm ci`, `npm test`, `npx tsc --noEmit`, `npx eslint .`, `npx prisma validate`. Require it on `main`. Run `prisma migrate deploy` only as a release step.
- **How to verify:** A pull request that fails `npm test` cannot merge.
- **Estimated effort:** S
- **Dependencies / tradeoffs:** `npm ci` must work from the lockfile. Do not point CI at the production database.

#### AUD-013 — Operability and docs nits

- **Priority:** P3
- **Status:** Confirmed
- **Category:** Reliability
- **Evidence:** `GET /api/v1/health` returns `{ status: "ok" }` without a database query (`src/app/api/v1/health/route.ts`). `DATABASE_URL` is `z.string().min(1)` (`src/shared/config/env.ts` lines 4–6), so the placeholder host `aws-0-[region].pooler.supabase.com` passes env validation and fails inside Prisma with P1013. `docs/setup.md` lines 81–83 still say checkout UI is unbuilt and the Telegram adapter is empty. Both exist. No account-deletion or retention code was found. Stock is an `isAvailable` flag, not a quantity.
- **Observed behavior:** The app can report healthy when Postgres is down. Invalid database URLs fail on the first query. Setup docs contradict the code.
- **Risk / user impact:** Slow local setup and a useless health check. Low security impact.
- **Recommended minimal fix:** Require `DATABASE_URL` to start with `postgres://` or `postgresql://` and to parse as a URL. Make `/api/v1/health` run `SELECT 1` and return 503 on failure. Replace the three stale sentences in `docs/setup.md`.
- **How to verify:** Starting the dev server with the example URL fails immediately with "DATABASE_URL". Health returns 503 when the database is unreachable.
- **Estimated effort:** S
- **Dependencies / tradeoffs:** None.

### Areas that passed the traced paths

- Telegram `initData` signature and `auth_date` expiry: `validateTelegramInitData`.
- Customer session cookie is `HttpOnly`; the database stores `tokenHash` only.
- Admin API does not HTML-redirect; `/api/admin/dashboard` returns 401 without a session.
- Payment-proof upload checks size and file signature, and admin download checks the tenant path prefix.
- Checkout totals are computed from database prices and tenant delivery settings.
- Service-role client is constructed in server modules only (`product-image-storage.ts`, `payment-proof-storage.ts`, `aba-qr-storage.ts`).
- `.env` and `.env.local` are gitignored and not tracked.

## 6. Missing or weak tests

The 230 unit tests mock collaborators or exercise pure functions. None open Postgres. There is no Playwright suite and no RLS test. Highest-value cases:

| Priority | Test name | Expected behavior |
| --- | --- | --- |
| P0 | `anon key cannot select orders` | With the anon key, `GET /rest/v1/orders` is denied. Run against a disposable Supabase project, not production. |
| P1 | `guest checkout does not rename an existing phone` | Same phone, different display name. Customer `displayName` is unchanged. New order confirmation does not include other orders. |
| P1 | `telegram handoff URL does not contain the session token` | Response HTML and redirect location have a one-time code. Reuse fails. |
| P1 | `email link stays off without the flag` | `NODE_ENV=development` and an unlinked seed email do not create a membership. |
| P1 | `tenant A cannot read tenant B order by number` | Same confirmation token presented to the other slug returns 404. |
| P2 | `idempotency replay ignores a different cart cookie` | Second caller does not receive the order body or confirmation cookie. |
| P2 | `payment proof rejects a renamed exe and accepts a real png` | Bytes starting with `MZ` fail. A real PNG under 5 MB is stored. |
| P2 | `checkout 429s after the cart limit` | Further posts return 429. The first valid post still returns 201. |
| P3 | `health returns 503 when SELECT 1 fails` | Status code 503 and no stack trace in the JSON body. |

## 7. Real-world product improvements

### Must-have before real orders

- Close or prove closed the Supabase Data API gap (AUD-001).
- Stop guest checkout from editing an existing customer (AUD-002).
- Remove the session token from `tg_s` (AUD-003).
- Turn off implicit admin email linking (AUD-004).
- Upgrade `next` and `zod` out of the flagged ranges (AUD-005).
- Confirm the payment-proof bucket is private (AUD-011).
- Put a real `DATABASE_URL` in `.env` and `.env.local`, then run `prisma migrate deploy` and `npm run db:seed` against that project. The copy in the working tree is still the example template.

### Optional

- GitHub Actions for the scripts that already pass locally (AUD-012).
- Rate limits (AUD-008) and the three security headers (AUD-009).
- Hash confirmation tokens (AUD-006).
- Role checks when a second staff member exists (AUD-010).
- Health check that hits the database, and a corrected `docs/setup.md` (AUD-013).
- A short Playwright smoke: storefront renders, empty phone is rejected, `/admin` redirects to login.
- Account deletion and a one-line privacy note for phone, address, and payment screenshots.
- Canonical URL and a basic sitemap once the public hostname is fixed. Metadata today is a title and a generic description (`src/app/(storefront)/[tenantSlug]/layout.tsx`).
- Quantity stock. The current flag only marks a product unavailable.

Accessibility notes from reading, not from a browser pass: product images use the media alt text or the product name. The admin login logo uses `alt=""`. Forms use visible labels in the admin login page. A keyboard and contrast pass in the browser was not done.

## 8. Recommended MVP scope

**Keep:** one tenant (`kin-a2`), guest checkout, COD and ABA transfer with a private proof upload, admin orders and catalog, Telegram Mini App sign-in for that one bot, the current unit tests.

**Defer:** staff roles, broadcasts to extra channels, referrals, loyalty, multi-tenant self-signup, OpenAPI portal, Playwright beyond one smoke test, quantity inventory.

**Exclude:** AI site generation, arbitrary HTML sections, a second backend service, Kubernetes, and a paid observability stack. `console.info` timing logs are enough until there are real users. Add a request id to `jsonError` only if debugging production becomes painful.

## 9. Practical implementation roadmap

### Phase 1 — Immediate security fixes

Actions: AUD-001, AUD-002, AUD-004, AUD-011. Rough effort: about one day.

Acceptance criteria:

- Anon key cannot read `orders` or `customers` on a disposable project.
- Guest checkout does not change an existing customer's name or email.
- A non-production server does not link an admin by email unless the flag is set.
- Payment-proof object URL is denied without the service role.

Regression risk: medium for AUD-002 if staff expect phone match to update the profile. Verification: the four tests in section 6 plus one manual guest checkout.

### Phase 2 — Working MVP fixes

Actions: AUD-003, AUD-005, real env and `prisma migrate deploy`, one happy-path order in a staging project. Rough effort: one to two days.

Acceptance criteria:

- Telegram account linking still sets a cookie, and the URL has no session token.
- `npm test` and `tsc --noEmit` pass on the upgraded Next.js and Zod.
- A staging order can be placed and seen in `/admin/orders`.

Regression risk: medium on the Next.js bump and the Telegram cookie workaround.

### Phase 3 — Launch hardening

Actions: AUD-006, AUD-007, AUD-008, AUD-009, AUD-012. Rough effort: one to two days.

Acceptance criteria: CI is required on `main`. Confirmation works from the cookie only. A tight loop against location search returns 429. Admin responses send `X-Frame-Options`, `Referrer-Policy`, and `X-Content-Type-Options`.

Regression risk: low to medium. Old confirmation links stop working.

### Phase 4 — Optional polish

Actions: AUD-010, AUD-013, Playwright smoke, privacy note, sitemap. Rough effort: one day, and only after a real order works.

Acceptance criteria: docs match the app. `/api/v1/health` fails when the database is down. Staff role cannot change payment settings.

## 10. Launch readiness checklist

- [x] Unit tests pass (`npm test`, 230 tests, 2026-10-30).
- [x] Typecheck passes (`npx tsc --noEmit`).
- [x] Lint passes (`npx eslint . --max-warnings 0`).
- [x] `.env` is gitignored and not tracked. Only `.env.example` is in git.
- [ ] Supabase Data API does not expose `public` tables to the anon key (AUD-001). Not verified.
- [ ] Guest checkout cannot rewrite another customer (AUD-002).
- [ ] Telegram handoff URL does not contain a session token (AUD-003).
- [ ] Admin email linking is off unless explicitly enabled (AUD-004).
- [ ] `next` and `zod` are outside the npm audit ranges flagged on 2026-10-30 (AUD-005).
- [ ] `payment-proofs` bucket is private (AUD-011). Not verified.
- [ ] Production `NODE_ENV` is `production`, and `ALLOW_ADMIN_EMAIL_LINK` is unset.
- [ ] Supabase email confirmation is required, and public sign-up is off if there is one admin.
- [ ] Staging migrate and seed have been run with a real session-mode pooler URL (port 5432).
- [ ] One staging order: add to cart, checkout, see it in admin, upload a proof, verify it.
- [ ] CI required on `main` (AUD-012).
- [ ] `npm run build` succeeds. Not run in this audit.
- [ ] Browser pass of storefront and admin on a phone-sized viewport. Not run.

## 11. Open questions and limitations

- This audit did not call the hosted Supabase project. AUD-001 and AUD-011 stay unverified on purpose.
- Supabase Auth settings (sign-up, email confirmation) are unknown, so AUD-004's exploitability in production is conditional.
- Production and preview `NODE_ENV` were not visible. The code treats every value other than `production` as allowed to link admins by email.
- `npm run build` and `npm run format:check` were not run. Lint, typecheck, and unit tests were.
- Not every Prisma call was traced. Notification delivery re-checks `tenantId` after a unique lookup. Category update relies on the service having checked ownership first (`src/modules/catalog/repositories/category-repository.ts`). A full query audit could still find a missed `tenantId`.
- No browser, keyboard, or contrast testing was done.
- Dependency findings are whatever `npm audit` reported on this date. They were not reproduced.
- AI is not implemented. If it is added later, keep it to a server-side call that returns data matching an existing Zod schema. Do not render model output as HTML, and do not send customer phone numbers or payment proofs to a model by default.

## 12. Top 5 next actions

1. On the Supabase project, revoke `anon` and `authenticated` access to the Prisma tables (or disable the Data API) and commit that SQL. Confirm the anon key cannot read `orders`.
2. Change `upsertCustomerByPhone` so a guest checkout does not update `displayName` or `email` of an existing customer.
3. Replace the `tg_s` payload with a one-time server-side code, and delete the `commerceos-tg-handoff` fallback.
4. Enable admin email linking only when `ALLOW_ADMIN_EMAIL_LINK=1`, and set `SEED_ADMIN_SUPABASE_USER_ID` before seeding.
5. Upgrade `next@15.5.20` and `zod@4.4.3` to versions outside the ranges `npm audit` flagged, then re-run `npm test` and `npx tsc --noEmit`.
