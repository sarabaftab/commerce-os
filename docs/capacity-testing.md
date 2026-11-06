# Capacity and load testing plan

Goal: learn whether CommerceOS can serve a given **concurrent** browse/checkout load, where it breaks first, and what to scale next — with **measured evidence**. This is not about sharding or buying a load balancer.

**Companion docs**

| Doc | Role |
| --- | --- |
| `docs/performance-runbook.md` | Exact commands, abort, where to look at logs |
| `reports/performance/capacity-findings.md` | Evidence log (what actually ran) |
| `reports/performance/README.md` | Where to put raw outputs |
| `.env.performance.example` | Env **names** only (no secrets) |
| `CURSOR_CAPACITY_TESTING_TASK.md` | Agent brief for formal runs |

---

## Safety (fail closed)

Load testing is **blocked** unless all of the following are true:

1. Target is **local with an isolated DB** or a **dedicated staging** Supabase project (not production shop data).
2. You set:

```bash
export LOAD_TEST_ENV=local    # or staging
export LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION
```

3. `npm run load:ramp` refuses to start without those values (see `scripts/load-ramp.ts`).
4. A Vercel **preview URL alone does not prove isolation** — check that deployment’s `DATABASE_URL` project ref ≠ production.
5. Never paste database passwords, full connection strings, service-role keys, or tokens into chat, commits, or report files. If secrets were exposed, **rotate** them in Supabase.

**Do not** ramp production. Soft smoke against a prod-linked DB that already happened is recorded as **non-compliant** in `capacity-findings.md`; it is not a capacity claim.

---

## 1. Credentials and inputs (names only)

Put real values only in gitignored `.env` / `.env.local` or staging host env. See `.env.performance.example`.

### Baseline (`npm run perf:baseline`)

| What | Env var | Where to find it |
| --- | --- | --- |
| Session-mode Postgres URI | `DATABASE_URL` | Supabase → Database → Connection string → **Session pooler**, port **5432** |
| Migrate URI | `DIRECT_URL` | Same session pooler URI is fine when `db.*` is IPv6-only |
| Tenant slug | `PERF_TENANT_SLUG` | Default `kin-a2` |
| App URL | `PERF_BASE_URL` | Optional; local or staging app for HTTP timings |

### Load ramp (`npm run load:ramp`)

| What | Env var | Notes |
| --- | --- | --- |
| Safety | `LOAD_TEST_ENV`, `LOAD_TEST_ACK` | Required |
| App URL | `LOAD_BASE_URL` | App whose DB you verified is non-prod |
| Tenant | `LOAD_TENANT_SLUG` | Default `kin-a2` |
| Levels | `LOAD_LEVELS` | Default `1,5,10,20` |
| Duration | `LOAD_DURATION_MS` | Default `8000` ms per level |

### Observe (no secrets)

| What | Where |
| --- | --- |
| Session pool size / compute | Supabase → Database → Connection pooling |
| `max clients reached` | Supabase logs during the test window |
| Hosted 5xx | Vercel logs for **staging** deployment |

**Not needed** for browse ramp: Telegram token, bank keys, service role in the load client.

---

## 2. What the scripts measure

### `npm run perf:baseline` (`scripts/perf-baseline.ts`)

- DB: each listed query **5** times → p50 / min / max (ms).
- HTTP (if `PERF_BASE_URL`): each path **3** times → p50 / min / max.
- **Does not** measure concurrent users or checkout writes.
- Sample sizes are small: treat p50 as indicative; do not over-claim p95 from 3–5 samples.

### `npm run load:ramp` (`scripts/load-ramp.ts`)

- **Read-only** GETs: `/{tenant}`, `/{tenant}/products`, `/{tenant}/cart`, `/api/v1/health`.
- Concurrency = N workers each looping requests for `LOAD_DURATION_MS` (closed-loop, not a fixed global RPS).
- Per level: requests, ok/fail, p50/p95/max, approx RPS; flags first level with &gt;5% failures (smoke threshold).
- **Does not** POST checkout, open DB connections itself, or prove pool exhaustion.
- **Does not** equal “simultaneous DB connections” or “monthly active users.”

### Geography

If the runner is in the **US** and Supabase is **`ap-southeast-1`** / **`ap-northeast-1`**, DB latency includes ocean RTT. Customers in **Singapore** with co-located app/DB will see different (usually better) latency. Always record tester region in findings.

### `next dev` vs production-mode

| Mode | Use |
| --- | --- |
| `next dev` | Local **smoke** only |
| `next build && next start` or Vercel **staging** | Numbers you cite as capacity evidence |

Do not generalize local dev-server results to Vercel production capacity.

---

## 3. Capacity model (hypothesis vs proven)

On Vercel + Supabase **session** pooler (port **5432**):

1. Production-like Prisma uses `connection_limit=1` per isolate.
2. Checkout interactive transactions need a **session** slot.
3. One production project was **observed** with **Nano** compute and **session pool size 15**. That is **configuration**, not proof of failure.
4. Pool **exhaustion** (`max clients reached`) is **unproven** until logs coincide with a failing test stage.

| Question | Answer |
| --- | --- |
| Serverless “clones”? | Vercel scales isolates; you do not pre-buy N. |
| Custom load balancer? | Not required in front of Vercel for this app. |
| Shard the DB? | Not an early step. Isolate staging, measure, then raise pool/compute if exhaustion is observed. |

**Active users ≠ concurrent checkouts ≠ pool size.**

---

## 4. Phased plan

### Phase A — Baseline (staging or isolated local DB)

1. Point `.env` at **staging** (or local Postgres), not production.
2. `npm run perf:baseline` then with `PERF_BASE_URL`.
3. Save output under `reports/performance/` (see README there).

### Phase B — Read-only ramp

Follow `docs/performance-runbook.md`. Smoke: short levels on isolated local. Claims: longer stages on staging production-mode deploy.

**Smoke tolerance:** &gt;5% errors → investigate / stop.  
**Claim SLO (provisional):** browse p95 ≤ 1000 ms **and** error rate &lt; 1% over a meaningful steady stage (unexpected 4xx/5xx; ignore intentional redirects).

If all stages pass, report **“passed through N tested VUs”** — do not invent a breaking point.

### Phase C — Infra correlation

During the ramp, capture pool settings + logs + Vercel 5xx. Label missing dashboards **not collected**. Do not claim pool exhaustion without evidence.

### Phase D — Checkout concurrency (`npm run load:checkout`)

Only on staging/local isolated DB, behind:

```bash
export LOAD_TEST_ENV=staging
export LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION
export LOAD_ALLOW_CHECKOUT=1
```

Uses real `placeGuestOrder` (pickup+COD), tags rows with `referralCode=LOADTEST`, optional cleanup. Measures serial hold-time and parallel waves. Does **not** prove Vercel isolate scaling by itself (one Node process).

### Phase E — Scale decisions (after evidence)

| If you observe… | Then | Not |
| --- | --- | --- |
| Pool errors at modest concurrency | Raise session pool / compute; keep staging separate | Shard |
| Browse slow, pool fine | Cache / query trim | Custom LB |
| Checkout fails first | Shorten transactions; rate-limit abuse; then pool | Multi-primary DB |

---

## 5. Checklist before any load run

- [ ] `LOAD_TEST_ENV` + `LOAD_TEST_ACK` set
- [ ] Supabase project under test is **not** production (name/ref written down)
- [ ] Staging/local app `DATABASE_URL` matches that project
- [ ] No extra local/preview processes sharing that pool unintentionally
- [ ] Tenant slug returns 200 on storefront
- [ ] Pool size / compute noted from dashboard
- [ ] No bank webhooks or Telegram broadcasts in scenario
- [ ] Someone watching logs for the first minutes
- [ ] Output path ready under `reports/performance/`

---

## 6. Hand-off to an agent (non-secrets only)

- Staging or local base URL  
- Tenant slug  
- “DB is staging-only: yes” + project **name** (not password)  
- Pool size + compute from dashboard  
- Target (e.g. 20 concurrent browsers)  
- Path to latest findings / stdout capture  

Keep passwords, service role, and bot tokens out of chat.
