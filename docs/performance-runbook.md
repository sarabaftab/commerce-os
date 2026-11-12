# Performance runbook

Reproducible commands for CommerceOS capacity checks. Companion to `docs/capacity-testing.md`.

## 1. Verify non-production isolation

Before **any** `load:ramp`:

1. Open the Supabase project used by the **app under test**.
2. Confirm project name/ref is **not** production (e.g. not the live “Billion Co. Commerce OS” shop DB).
3. Prefer a dedicated staging project. A Vercel preview that still points at prod `DATABASE_URL` is **not** isolated.
4. Note compute size and **session pool size** from Database → Connection pooling.
5. Ensure other terminals are not also running `npm run dev` against that same pool if you care about clean numbers.
6. Set:

```bash
export LOAD_TEST_ENV=staging   # or local
export LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION
```

Without both, `npm run load:ramp` exits immediately.

## 2. Baseline latency

App optional for DB-only; required for HTTP.

```bash
# DB queries (uses DATABASE_URL from .env / .env.local)
npm run perf:baseline

# DB + HTTP (dev server or staging)
PERF_BASE_URL=http://localhost:3000 \
PERF_TENANT_SLUG=kin-a2 \
npm run perf:baseline
```

Save stdout to `reports/performance/YYYYMMDD-HHMM-baseline.txt`. Do not invent timings.

**Interpretation:** US runner → `ap-southeast-1` / Tokyo DB includes ocean RTT. Singapore users + co-located compute will differ.

## 3. Read-only load ramp

```bash
# Smoke (short) — only if DB is isolated or you accept smoke-only labeling
LOAD_TEST_ENV=local \
LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION \
LOAD_BASE_URL=http://localhost:3000 \
LOAD_TENANT_SLUG=kin-a2 \
LOAD_LEVELS=1,3,5 \
LOAD_DURATION_MS=5000 \
npm run load:ramp

# Claim-oriented (longer stages; staging + production-mode app)
LOAD_TEST_ENV=staging \
LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION \
LOAD_BASE_URL=https://YOUR-STAGING.vercel.app \
LOAD_TENANT_SLUG=kin-a2 \
LOAD_LEVELS=1,5,10,20 \
LOAD_DURATION_MS=20000 \
npm run load:ramp
```

Save stdout to `reports/performance/YYYYMMDD-HHMM-ramp.txt` and summarize in `reports/performance/capacity-findings.md`.

### Abort conditions

Stop (Ctrl+C) if:

- Error rate climbs above ~5% on a stage with enough requests (smoke), or above claim SLO (&lt;1% errors / p95 target)
- Repeated 5xx / timeouts
- Supabase shows `max clients reached` or connection storms
- You discover the target DB is production mid-run

## 4. Where to view infra evidence

| Signal | Where |
| --- | --- |
| Pool size / compute | Supabase → Database → Settings → Connection pooling |
| DB errors | Supabase → Logs during the test timestamp |
| Hosted app 5xx | Vercel → staging project → Logs / Analytics |
| App timing badge | Admin with `TIMING_DEBUG=1` (not a load tool) |

If you cannot access a dashboard, write **not collected** in findings — do not invent pool exhaustion.

## 5. Checkout hold-time / concurrency (staging only)

```bash
LOAD_TEST_ENV=staging \
LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION \
LOAD_ALLOW_CHECKOUT=1 \
LOAD_CHECKOUT_SERIAL=8 \
LOAD_CHECKOUT_LEVELS=1,3,5,8,10 \
LOAD_CHECKOUT_CLEANUP=1 \
npm run load:checkout
```

Save stdout to `reports/performance/YYYYMMDD-HHMM-checkout.txt`.

Still do **not**:

- Hard ramps against production
- Tests that trigger real ABA/PayWay or Telegram broadcasts to real customers

## 6. Cleanup

Read-only GET ramp: no DB cleanup.  
Future checkout tests must use tagged fake data and a documented delete scope.

## 7. Prefer production-mode for claims

| Mode | Use for |
| --- | --- |
| `next dev` | Local smoke only |
| `next build && next start` or Vercel staging | Numbers you cite as capacity evidence |
