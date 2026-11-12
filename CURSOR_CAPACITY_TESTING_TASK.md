# Cursor Task: Prove CommerceOS Capacity With Measured Evidence

Canonical agent brief. Prefer this file over any `* copy.md` duplicate.

## Current blockers (read first)

1. ~~No staging Supabase~~ — staging `kyjkvumfjepntlizmcph` used for run `20261105-0334`.
2. Prior smoke used a **production-linked** DB → still recorded as non-compliant (Run A/B).
3. ~~Checkout script / order_number race~~ — fixed + re-tested (`20261105-0433`); 1–5 parallel ok; 8–10 hit 20s tx timeout (US→Tokyo).
4. Do not paste secrets into chat; rotate any that were exposed.
5. Vercel production-mode / Singapore co-located latency still unproven.

## Project docs

- `docs/capacity-testing.md` — plan, safety, script semantics, SLOs
- `docs/performance-runbook.md` — exact commands and abort rules
- `reports/performance/capacity-findings.md` — evidence log
- `reports/performance/README.md` — where raw outputs go
- `.env.performance.example` — env **names** only
- Scripts: `npm run perf:baseline`, `npm run load:ramp` (**requires** `LOAD_TEST_ENV` + `LOAD_TEST_ACK`)

## Objective

Answer with evidence only:

1. Baseline latency for storefront + key DB ops under little load  
2. Concurrent browse capacity within explicit latency/error targets  
3. Load level where errors or tail latency degrade (if observed)  
4. Whether the limit is session-pool exhaustion or something else (**logs required**)  
5. Staging-only parallel checkouts (only if safe and implemented)

**Not permitted:** stress production, purchase plans, shard DB, add a load balancer, or invent metrics.

## Known facts (verify again before citing)

- Next.js on Vercel; Supabase Postgres via Prisma; session pooler port **5432** for interactive transactions (do not switch checkout to **6543**).
- One production project was observed: **Nano**, **pool size 15** — config, not exhaustion proof.
- `load:ramp` is read-only GETs and fail-closes without ack flags.

## Safety

- `LOAD_TEST_ENV=local|staging` and `LOAD_TEST_ACK=I_CONFIRM_NON_PRODUCTION` required for ramp.
- Preview URL ≠ database isolation.
- No secrets in reports; redact connection strings.
- No real bank/Telegram/customer abuse paths.

## Deliverables after a valid staging run

- Append measured section to `reports/performance/capacity-findings.md`
- Add `reports/performance/<timestamp>-baseline.txt` (and/or JSON) and `-ramp.txt`
- Keep runbook accurate; minimal code changes

## Final response format

Files touched, commands (redacted), environment isolation proof, confirmed vs unproven, report paths, next safe command.

**Do not claim 100/1000 shoppers without tests. Do not claim pool exhaustion without logs.**
