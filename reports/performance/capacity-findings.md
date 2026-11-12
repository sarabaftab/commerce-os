# Capacity findings (evidence log)

Last updated: 2026-11-05 (UTC run id `20261105-0433`)  
Repo scripts: `npm run perf:baseline`, `npm run load:ramp`, `npm run load:checkout` (ack-gated)  
Plan / runbook: `docs/capacity-testing.md`, `docs/performance-runbook.md`

## Executive summary

- **Confirmed:** dedicated staging Supabase `commerce-os-staging` (`kyjkvumfjepntlizmcph`, Tokyo `ap-northeast-1`) isolated from prod (`vjkfamyhtsyogxuvjkns`).
- **Confirmed (staging browse, `next dev`):** ramp **1 → 5 → 10 → 20 VU**, **0% HTTP failures**. At **20 VU**, p95 ≈ **4357 ms** (US runner → Tokyo; soft latency degradation, not hard errors).
- **Confirmed (checkout):** serial `placeGuestOrder` hold wall-time p50 ≈ **7.5–7.7 s** from US→Tokyo. Idealized pool/hold ≈ **~2 checkout/s** at pool 15 — **hypothesis**, not Vercel proof.
- **Fixed:** `allocateOrderNumber` now uses atomic `UPDATE … RETURNING` (was racing). Re-test: parallel **1–5 VU = 100% ok**; no more order_number unique violations.
- **Confirmed (post-fix):** at **8–10 parallel** checkouts from US→Tokyo, some fail with Prisma **interactive transaction timeout (20s)** while queued behind other checkouts — **not** `max clients reached`.
- **Unproven:** session pool exhaustion; Vercel production-mode capacity; Singapore co-located latency.
- **Do not claim** nationwide simultaneous checkout or 100/1000 shoppers from this file.

## What we can say today (honest)

| Statement | OK? |
| --- | --- |
| Staging DB isolation proven (different project ref than prod) | Yes |
| Browse to 20 VU on staging `next dev` had 0% HTTP errors | Yes (measured) |
| Latency under load rises with VU (US → Tokyo) | Yes (measured) |
| Order-number race under parallel checkout | **Fixed** (re-tested) |
| Parallel checkout 1–5 VU on staging (US runner) | Yes (0 fails) |
| Parallel checkout ≥8 VU under US→Tokyo RTT | Partial — 20s tx timeout under queue |
| Comfortable concurrent checkouts ≈ pool 15 | Still **unproven** (timeouts ≠ pool exhaustion) |
| Vercel production capacity | Not established |

---

## Run A — early smoke (no ack flags yet)

| Item | Value |
| --- | --- |
| Date | 2026-11-03 |
| App | `next dev` @ `http://localhost:3000` |
| Isolation | Prod-linked DB — non-compliant for claims |
| Levels | 1, 3, 5 × 5s |

| VU | Requests | Error % | p50 | p95 | RPS |
| ---: | ---: | ---: | ---: | ---: | ---: |
| 1 | 34 | 0% | 140 | 241 | 6.6 |
| 3 | 54 | 0% | 245 | 824 | 10.3 |
| 5 | 65 | 0% | 357 | 677 | 12.4 |

Raw: not saved at the time.

---

## Run B — ack-gated smoke (`20261104-0457`)

| Item | Value |
| --- | --- |
| Date | 2026-11-04 ~04:57 UTC |
| App | `next dev` @ `http://localhost:3000` |
| DB | Session pooler `aws-0-ap-southeast-1.pooler.supabase.com` (ref redacted) |
| Isolation | **Still prod-linked** — smoke only |
| Ack | `LOAD_TEST_ENV=local` + `LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION` |
| Tester | United States → SE Asia (DB RTT inflated vs Singapore) |
| Levels | 1, 3, 5, 8 × 6s |

### Baseline (same run)

| Label | p50 ms |
| --- | ---: |
| db.homepage_catalog | 701 |
| db.products_list | 638 |
| db.product_detail | 630 |
| db.open_cart_lean | 633 |
| db.admin_product_list_lean | 422 |
| db.admin_dashboard_counts | 427 |
| http/kin-a2 | 140 |
| http/kin-a2/products | 131 |
| http/kin-a2/cart | 79 |
| http/kin-a2/checkout | 76 |
| http/admin | 4 |

### Ramp

| Scenario | Env | VU | Dur | Req | p50 | p95 | RPS | Err % | Pool errors | Result |
| --- | --- | ---: | ---: | ---: | ---: | ---: | ---: | ---: | --- | --- |
| Read-only | local `next dev` + prod-linked | 1 | 6s | 39 | 137 | 297 | 6.5 | 0% | not collected | PASS smoke |
| Read-only | same | 3 | 6s | 63 | 250 | 570 | 8.2 | 0% | not collected | PASS smoke |
| Read-only | same | 5 | 6s | 70 | 411 | 836 | 10.9 | 0% | not collected | PASS smoke |
| Read-only | same | 8 | 6s | 72 | 603 | 1270 | 11.8 | 0% | not collected | PASS smoke; p95 &gt; 1s SLO |
| Staging claim ramp | staging | — | — | — | — | — | — | — | — | see Run C |
| Checkout concurrency | staging | — | — | — | — | — | — | — | — | see Run C |

Raw outputs:

- `reports/performance/20261104-0457-baseline.txt`
- `reports/performance/20261104-0457-ramp.txt`

---

## Run C — staging isolated (`20261105-0334`)

| Item | Value |
| --- | --- |
| Date | 2026-11-05 ~03:34 UTC |
| App | `next dev` @ `http://localhost:3000` (browse); checkout via `npm run load:checkout` (in-process `placeGuestOrder`) |
| DB | Session pooler `aws-0-ap-northeast-1.pooler.supabase.com` · project `commerce-os-staging` / `kyjkvumfjepntlizmcph` |
| Isolation | **Staging-only** (prod backup ref `vjkfamyhtsyogxuvjkns`) |
| Ack | `LOAD_TEST_ENV=staging` + `LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION` (+ `LOAD_ALLOW_CHECKOUT=1` for checkout) |
| Tester | United States → Tokyo (DB RTT inflated vs Singapore) |
| Label | Staging evidence on **dev server** — not Vercel production-mode claim |

### Baseline

| Label | p50 ms |
| --- | ---: |
| db.homepage_catalog | 1722 |
| db.products_list | 1285 |
| db.product_detail | 863 |
| db.open_cart_lean | 149 |
| db.admin_product_list_lean | 950 |
| db.admin_dashboard_counts | 646 |
| http/kin-a2 | 163 |
| http/kin-a2/products | 208 |
| http/kin-a2/cart | 159 |
| http/kin-a2/checkout | 110 |

### Browse ramp (8s/level)

| VU | Req | Err % | p50 | p95 | RPS | Result |
| ---: | ---: | ---: | ---: | ---: | ---: | --- |
| 1 | 24 | 0% | 230 | 1231 | 3.0 | PASS |
| 5 | 75 | 0% | 415 | 1244 | 9.1 | PASS |
| 10 | 90 | 0% | 888 | 1478 | 11.2 | PASS |
| 20 | 56 | 0% | 3642 | 4357 | 6.2 | PASS errors; p95 ≫ 1s SLO |

### Checkout (`load:checkout`)

| Metric | Value |
| --- | --- |
| Serial hold wall p50 / p95 / max | **7466 / 18986 / 18986** ms (n=8, 0 fails) |
| Idealized checkouts/s @ pool 15 | ~2/s (= 15 / 7.466) — **hypothesis only** |
| Parallel 1 VU | 1/1 ok |
| Parallel 3 VU | 2/3 ok — first **order_number** unique constraint failures |
| Parallel 5 / 8 / 10 VU | 2/5, 4/8, 3/10 ok — same race |
| Pool exhaustion logs | **not collected** (failures were app uniqueness, not pooler) |
| Cleanup | Removed 20 `referralCode=LOADTEST` orders |

Raw outputs:

- `reports/performance/20261105-0334-baseline.txt`
- `reports/performance/20261105-0334-ramp.txt`
- `reports/performance/20261105-0334-checkout.txt`

---

## Run D — after order-number fix (`20261105-0433`)

| Item | Value |
| --- | --- |
| Change | `allocateOrderNumber` → atomic `UPDATE tenants … RETURNING order_sequence` |
| Serial hold p50 | **7674 ms** (n=5, 0 fails) |
| Parallel 1 / 3 / 5 | **1/1, 3/3, 5/5 ok** — no order_number collisions |
| Parallel 8 | 6/8 ok — fails = interactive tx **timeout 20s** |
| Parallel 10 | 9/10 ok — same timeout |
| Pool exhaustion | **not observed** / not collected |

Raw: `reports/performance/20261105-0433-checkout.txt`

---

## Bottleneck diagnosis

| Hypothesis | Evidence | Status |
| --- | --- | --- |
| Session pool 15 limits concurrent checkouts | Dashboard Nano/pool 15 (prod); interactive txs | Config **observed**; failure **unproven** on staging |
| Browse latency degrades before hard errors | Staging: p95 1231 → 4357 ms from 1 → 20 VU | **Observed** (US→Tokyo, `next dev`) |
| Order number allocation races under concurrency | Unique constraint at ≥3 VU (Run C); fixed + re-tested (Run D) | **Fixed** |
| Checkout tx timeout under concurrency + high RTT | 20s interactive timeout at 8–10 VU (US→Tokyo) | **Observed** |
| Pool exhaustion first failure | No `max clients reached` captured | **Unproven** |
| Vercel function limit first | No hosted staging ramp | Unproven |

## Priority next actions

1. ~~Fix `allocateOrderNumber`~~ done (Run D).  
2. Prefer staging/prod DB in **Singapore** (`ap-southeast-1`) so hold-time isn’t US→Tokyo inflated.  
3. Re-measure checkout concurrency from a closer runner (or accept US numbers as worst-case).  
4. Capture Supabase pool logs during a high-VU checkout wave.  
5. Optional: shorten checkout transaction work / revisit 20s timeout only with evidence.  
6. Raise compute/pool only if exhaustion is observed.

## Confirmed / unproven / next

1. **Confirmed:** staging isolation; browse 20 VU 0% errors; checkout serial hold ~7.5s p50 (US→Tokyo); order-number race **fixed**; parallel checkout solid through **5 VU**.  
2. **Unproven:** pool exhaustion; Vercel prod capacity; Singapore-local latency.  
3. **Max tested passing (browse errors):** 20 VU staging `next dev`.  
4. **Max tested passing (checkout, US runner):** **5 parallel** (8–10 hit 20s tx timeout).  
5. **Next:** Singapore-region DB / closer runner, then re-run `load:checkout`.
