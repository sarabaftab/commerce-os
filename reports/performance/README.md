# Performance reports

Put **timestamped** capacity outputs here. Never commit secrets, full `DATABASE_URL`s, or service-role keys.

## Expected files

| Pattern | Contents |
| --- | --- |
| `YYYYMMDD-HHMM-baseline.txt` (or `.json`) | Stdout / structured output of `npm run perf:baseline` |
| `YYYYMMDD-HHMM-ramp.txt` (or `.json`) | Stdout / structured output of `npm run load:ramp` |
| `YYYYMMDD-HHMM-checkout.txt` | Stdout of `npm run load:checkout` |
| `capacity-findings.md` | Human evidence log (confirmed vs unproven) |

## Rules

1. **Smoke** (`next dev`, short levels) ≠ **claim** (staging, production-mode, longer stages).
2. Do not fabricate JSON if a test did not run — note `NOT RUN` in `capacity-findings.md`.
3. Redact hostnames that embed credentials; project **name** is OK, passwords are not.
4. A run against a production-linked DB must be labeled **non-compliant** and must not be used as capacity proof.

See `docs/capacity-testing.md` and `docs/performance-runbook.md`.
