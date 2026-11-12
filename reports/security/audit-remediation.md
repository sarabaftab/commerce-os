# Audit remediation report

Last updated: 2026-11-09  
Source findings: `PROJECT_AUDIT_REPORT.md`  
Staging project: Supabase `kyjkvumfjepntlizmcph` (Tokyo)

## Executive summary

All **AUD-001 … AUD-013** items from the project audit were addressed in code, migrations, and/or hosted staging config.

| Metric | Value |
| --- | --- |
| Findings closed | 13 / 13 |
| Dedicated AUD unit test files | 13 (`tests/unit/aud-*.ts`) |
| AUD unit tests | **47** (all passing) |
| Migrations added | 4 |
| Staging live checks | AUD-001 Data API deny; AUD-011 private bucket; Prisma still reads |

### How to re-run the tests for these fixes

```bash
npx vitest run tests/unit/aud-*.ts
```

Full suite (includes the AUD files):

```bash
npm test
```

---

## Status board

| ID | Priority | Finding (short) | Status | Test file | Tests |
| --- | --- | --- | --- | --- | --- |
| AUD-001 | P0 | Supabase Data API / no RLS | **Fixed** + staging verified | `aud-001-data-api-lockdown.test.ts` | 2 |
| AUD-002 | P1 | Guest checkout overwrites customer | **Fixed** | `aud-002-guest-checkout-customer-overwrite.test.ts` | 4 |
| AUD-003 | P1 | Session token in Telegram URL | **Fixed** | `aud-003-telegram-session-handoff.test.ts` | 4 |
| AUD-004 | P1 | Admin email link without flag | **Fixed** | `aud-004-admin-email-link.test.ts` | 4 |
| AUD-005 | P1 | `next` / `zod` audit ranges | **Fixed** | `aud-005-dependency-versions.test.ts` | 2 |
| AUD-006 | P2 | Plaintext confirmation tokens | **Fixed** | `aud-006-confirmation-token-hash.test.ts` | 4 |
| AUD-007 | P2 | Idempotency not caller-bound | **Fixed** | `aud-007-checkout-idempotency-binding.test.ts` | 5 |
| AUD-008 | P2 | No rate limits | **Fixed** | `aud-008-rate-limit.test.ts` | 5 |
| AUD-009 | P2 | Headers + image host `**` | **Fixed** | `aud-009-security-headers-media.test.ts` | 5 |
| AUD-010 | P2 | Roles stored, not enforced | **Fixed** | `aud-010-admin-roles.test.ts` | 3 |
| AUD-011 | P2 | Payment-proof bucket privacy | **Fixed** + staging verified | `aud-011-payment-proof-bucket-private.test.ts` | 4 |
| AUD-012 | P2 | No CI workflow | **Fixed** | `aud-012-ci-workflow.test.ts` | 1 |
| AUD-013 | P3 | Health / env URL / stale docs | **Fixed** | `aud-013-health-env-docs.test.ts` | 4 |

---

## Per-finding detail

### AUD-001 — Lock down Supabase Data API

**Fix:** Revoke `anon` / `authenticated` privileges on public tables; enable RLS (no `FORCE`, so Prisma DB role still works).

**Files / migrations**
- `prisma/migrations/20261109030000_lock_down_supabase_data_api/migration.sql` *(new)*
- `docs/setup.md` *(note)*

**Test created**
- `tests/unit/aud-001-data-api-lockdown.test.ts`

**Staging verification (2026-11-09)**
- `GET /rest/v1/orders` with anon key → **401** `permission denied for table orders`
- `GET /rest/v1/customers` with anon key → **401**
- Prisma `SELECT COUNT(*) FROM orders` → still works

---

### AUD-002 — Guest checkout must not overwrite customer profile

**Fix:** Phone match still links the order; do not update `displayName` / `email` on an existing customer during guest checkout.

**Files changed**
- `src/modules/customers/repositories/customer-repository.ts`
- Related checkout path via `placeGuestOrder` / customer upsert callers

**Test created**
- `tests/unit/aud-002-guest-checkout-customer-overwrite.test.ts`

---

### AUD-003 — Telegram one-time session handoff (no session in URL)

**Fix:** Store a hashed one-time code; put only that code in the URL; exchange via API / middleware. Removed hardcoded handoff secret fallback.

**Files / migrations**
- `src/channels/telegram/server/session-handoff.ts`
- `src/channels/telegram/server/session-form.ts`
- `src/app/api/v1/[tenantSlug]/telegram/session-handoff/route.ts` *(new / used)*
- `src/middleware.ts`
- `prisma/migrations/20261109010000_telegram_session_handoff/migration.sql` *(new)*

**Test created**
- `tests/unit/aud-003-telegram-session-handoff.test.ts`

---

### AUD-004 — Admin email linking only with explicit flag

**Fix:** Link unlinked seed admin by email only when `ALLOW_ADMIN_EMAIL_LINK=1` (not merely `NODE_ENV !== production`).

**Files changed**
- `src/modules/identity/services/admin-auth-service.ts`
- `docs/setup.md` *(documents the flag)*

**Test created**
- `tests/unit/aud-004-admin-email-link.test.ts`

---

### AUD-005 — Upgrade `next` and `zod`

**Fix:** Bump direct dependencies outside the ranges flagged by the audit.

**Files changed**
- `package.json` — `next@^15.5.29`, `zod@^4.6.7`
- `package-lock.json`

**Test created**
- `tests/unit/aud-005-dependency-versions.test.ts`

---

### AUD-006 — Hash confirmation tokens; cookie-only access

**Fix:** Store SHA-256 of confirmation token; stop accepting `?token=` for order access; cookie remains the client secret.

**Files / migrations**
- `src/shared/orders/confirmation-cookie.ts`
- Order confirmation / access call sites
- `prisma/schema.prisma` (+ related order fields)
- `prisma/migrations/20261109020000_hash_order_confirmation_tokens/migration.sql` *(new)*

**Test created**
- `tests/unit/aud-006-confirmation-token-hash.test.ts`

---

### AUD-007 — Bind checkout idempotency replay to caller

**Fix:** Idempotent replay must match the original cart / customer binding; mismatched callers do not receive the prior order.

**Files changed**
- `src/modules/orders/services/checkout-idempotency.ts`
- `src/modules/orders/services/checkout-service.ts`
- Cart cookie retention behavior on success path (guest token kept where required)

**Test created**
- `tests/unit/aud-007-checkout-idempotency-binding.test.ts`

---

### AUD-008 — Rate limits on checkout / location / Telegram

**Fix:** Shared in-memory rate limiter applied to public write/proxy routes.

**Files changed**
- `src/shared/http/rate-limit.ts` *(new)*
- `src/app/api/v1/[tenantSlug]/checkout/route.ts`
- `src/app/api/location/search/route.ts`
- Telegram auth / related API routes under `src/app/api/v1/`

**Test created**
- `tests/unit/aud-008-rate-limit.test.ts`

---

### AUD-009 — Security headers + media host lockdown

**Fix:** Add baseline security headers; restrict Next image `remotePatterns` (no `hostname: "**"`); validate product media URLs against allowlist.

**Files changed**
- `next.config.ts`
- `src/shared/media/allowed-media-url.ts` *(new)*
- `src/modules/catalog/schemas/product.ts`
- `src/ui/storefront/product-image.tsx` *(as needed)*

**Test created**
- `tests/unit/aud-009-security-headers-media.test.ts`

---

### AUD-010 — Enforce owner / admin / staff roles

**Fix:** `owner` and `admin` may change settings, publish broadcasts, and verify/reject payment proofs. `staff` can still handle catalog/orders/customers. Nav and UI hide manager-only surfaces.

**Files changed**
- `src/shared/auth/admin-roles.ts` *(new)*
- `src/shared/auth/admin-session.ts` — `assertAdminRole`, `requireAdminSessionWithRoles`
- `src/modules/settings/actions/settings-actions.ts`
- `src/modules/broadcasts/actions/broadcast-actions.ts`
- `src/modules/orders/actions/payment-proof-actions.ts`
- `src/modules/orders/components/admin/order-payment-panel.tsx`
- `src/app/(admin)/admin/settings/page.tsx`
- `src/app/(admin)/admin/broadcasts/page.tsx`
- `src/app/(admin)/admin/orders/[orderId]/page.tsx`
- `src/ui/admin/admin-nav.tsx`
- `src/ui/admin/admin-shell.tsx`

**Test created**
- `tests/unit/aud-010-admin-roles.test.ts`

---

### AUD-011 — Payment-proofs bucket private

**Fix:** Migration forces bucket `public = false` and drops matching Storage policies; app ensures private bucket on upload/download; never uses `getPublicUrl` for proofs.

**Files / migrations**
- `prisma/migrations/20261109040000_private_payment_proofs_bucket/migration.sql` *(new)*
- `src/shared/storage/payment-proof-storage.ts` — `ensurePrivatePaymentProofBucket`
- `docs/setup.md` *(note)*

**Test created**
- `tests/unit/aud-011-payment-proof-bucket-private.test.ts`

**Staging verification (2026-11-09)**
- Created `payment-proofs` with **`public: false`**
- Anon `…/storage/v1/object/public/payment-proofs/…` → **404** Bucket not found / denied
- Service-role bucket metadata → `public: false`

---

### AUD-012 — GitHub Actions CI

**Fix:** Workflow runs Prisma validate/generate, tests, typecheck, and lint on PRs and `main`.

**Files changed**
- `.github/workflows/ci.yml` *(new)*

**Test created**
- `tests/unit/aud-012-ci-workflow.test.ts`

---

### AUD-013 — Health check, env URL validation, setup docs

**Fix:** Health runs `SELECT 1` and returns **503** if DB is down; `DATABASE_URL` / `DIRECT_URL` must be valid `postgres(ql)://` URLs; setup docs updated (checkout/Telegram/admin link flag).

**Files changed**
- `src/app/api/v1/health/route.ts`
- `src/shared/config/env.ts` — `postgresConnectionUrl`
- `docs/setup.md`

**Test created**
- `tests/unit/aud-013-health-env-docs.test.ts`

---

## Migrations added for remediation

| Migration | AUD |
| --- | --- |
| `prisma/migrations/20261109010000_telegram_session_handoff/` | AUD-003 |
| `prisma/migrations/20261109020000_hash_order_confirmation_tokens/` | AUD-006 |
| `prisma/migrations/20261109030000_lock_down_supabase_data_api/` | AUD-001 |
| `prisma/migrations/20261109040000_private_payment_proofs_bucket/` | AUD-011 |

Applied on staging with `npx prisma migrate deploy` (2026-11-09).

---

## Test inventory (created for these fixes)

| File | Cases |
| --- | --- |
| `tests/unit/aud-001-data-api-lockdown.test.ts` | 2 |
| `tests/unit/aud-002-guest-checkout-customer-overwrite.test.ts` | 4 |
| `tests/unit/aud-003-telegram-session-handoff.test.ts` | 4 |
| `tests/unit/aud-004-admin-email-link.test.ts` | 4 |
| `tests/unit/aud-005-dependency-versions.test.ts` | 2 |
| `tests/unit/aud-006-confirmation-token-hash.test.ts` | 4 |
| `tests/unit/aud-007-checkout-idempotency-binding.test.ts` | 5 |
| `tests/unit/aud-008-rate-limit.test.ts` | 5 |
| `tests/unit/aud-009-security-headers-media.test.ts` | 5 |
| `tests/unit/aud-010-admin-roles.test.ts` | 3 |
| `tests/unit/aud-011-payment-proof-bucket-private.test.ts` | 4 |
| `tests/unit/aud-012-ci-workflow.test.ts` | 1 |
| `tests/unit/aud-013-health-env-docs.test.ts` | 4 |
| **Total** | **47** |

Last local run of AUD suite: **13 files, 47 tests, all passed** (2026-11-09).

---

## Related (not this report)

- Capacity / load evidence: `reports/performance/capacity-findings.md`
- Original audit narrative: `PROJECT_AUDIT_REPORT.md`

## Optional follow-ups (outside code)

- Enable GitHub branch protection so CI is required before merge
- Rotate any secrets that were ever shared in chat / screenshots
- Re-apply the same two Supabase migrations on production when cutting over
