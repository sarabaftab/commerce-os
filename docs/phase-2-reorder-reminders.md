# Phase 2 — Reorder Reminders & Shared Scheduling (internal)

## Vercel Cron constraints

- Hobby: **once per day** minimum interval; ±59 minute precision; cron timezone is **UTC**.
- This project schedules `/api/cron/daily` at `0 1 * * *` (01:00 UTC ≈ **08:00 Asia/Phnom_Penh**).
- Secure with `CRON_SECRET` (`Authorization: Bearer …`). Required in production.

## Defaults

- `reorderRemindersEnabled = false` until an interval is approved.
- Provisional stored interval: **14 days** (7–90 allowed). No prior tenant setting or client doc specified an interval.

## Reuse for subscriptions

`runTenantScheduledJob` + `ScheduledJobRun` (unique on `jobKey` + `tenantId` + Cambodia `runDateKey`) can host a future `subscription_generate` handler without new queue infrastructure.
