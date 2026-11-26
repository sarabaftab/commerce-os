# Phase 2 — Reporting & Customer Insights (internal)

## 1. Agreed scope

Customer Insights / Reporting & Insights for store administrators: a lightweight **Admin → Insights** page using data CommerceOS already collects (orders, customers, first-touch sources, order feedback).

## 2. V1 features implemented

- Date filters: Last 7 days, Last 30 days (default), custom From/To (max 366 Cambodia calendar days).
- Summary cards: Total Sales, Total Orders, Average Order Value, New Customers, Returning Customers.
- Sales trend chart (CSS bars; daily ≤30 days, weekly otherwise).
- Customer sources breakdown for customers who ordered in the period.
- Customer feedback average rating + submission count (by feedback `created_at`).
- Tenant-scoped server queries only; no new tables, workers, or analytics vendors.

## 3. Metric definitions

| Metric | Definition |
|--------|------------|
| **Total Sales** | Sum of `orders.total_minor` for **eligible sales orders** in the window. Labelled as order revenue, not profit. |
| **Eligible sales order** | `status != cancelled` AND not (`payment_method = aba_transfer` AND `payment_proof_status IN (awaiting_proof, rejected)`). |
| **Total Orders** | Count of **all** orders with `placed_at` in the window (any status, including cancelled). |
| **Average Order Value** | `Total Sales / eligible order count`. `null` / displayed as `—` when eligible count is 0. |
| **New Customers** | Unique customers with a non-cancelled order in the window whose **first order of any status** has `placed_at >= window.from`. |
| **Returning Customers** | Unique customers with a non-cancelled order in the window whose first order of any status is before `window.from`. |
| **Customer Sources** | Unique customers with a non-cancelled order in the window, grouped by stored `customers.source_kind` (Telegram / Referral / Marketing / Unknown). First-touch attribution is not modified. |
| **Feedback** | `order_feedback` rows with `created_at` in the window: average `rating`, total count. |
| **Sales trend** | Eligible sales totals bucketed by Asia/Phnom_Penh calendar day (or week starting Monday). Days/weeks with zero sales are included. |

## 4. Order / payment statuses counting toward sales

**Included (when not cancelled):**

- COD orders (any `payment_proof_status`; COD collection is not separately tracked).
- ABA with `submitted`, `verified`, or `not_required`.

**Excluded:**

- `cancelled` (any payment method).
- ABA with `awaiting_proof` or `rejected` (treated as unpaid / failed proof).

**Not represented in schema (cannot be excluded):**

- Refunds / partial refunds.
- Explicit COD “cash collected” flag.

## 5. Date filtering and timezone

- Business timezone: **Asia/Phnom_Penh** (UTC+7, no DST).
- Presets: rolling windows from `now - N days` to `now` (same style as the admin dashboard presets).
- Custom From/To: Cambodia calendar day start/end converted to UTC (`T00:00:00+07:00` … `T23:59:59.999+07:00`).
- Invalid, inverted, or >366-day custom ranges fall back to the selected/default preset.
- Administrator browser timezone does not affect bucket boundaries.

## 6. Customer source attribution interpretation

Reuses Phase 2 Feature 1 first-touch fields (`source_kind` / `source_key`). Insights only reads them. Unknown = null kind. Period membership requires a non-cancelled order in range; each customer is counted once.

## 7. Customer feedback reporting rules

Reuses `order_feedback`. Filtered by feedback submission time, not order `placed_at`. Does not change submission rules.

## 8. Files added or modified

**Added**

- `src/shared/time/format-cambodia.ts`
- `src/modules/orders/insights-range.ts`
- `src/modules/orders/services/insights-stats-service.ts`
- `src/modules/orders/components/admin/insights-range-selector.tsx`
- `src/modules/orders/components/admin/insights-sections.tsx`
- `src/app/(admin)/admin/insights/page.tsx`
- `tests/unit/insights-range.test.ts`
- `tests/unit/insights-stats.test.ts`
- `docs/phase-2-reporting-insights.md`

**Modified**

- `src/ui/admin/admin-nav.tsx` (Insights link)

**Not modified for this feature**

- Customer source capture / feedback submission services.
- Admin dashboard live metrics (still no Total Sales card on this branch’s dashboard).
- Checkout, payments, order transitions, Telegram auth.

## 9. Schema changes

None for Insights. Relies on existing `orders`, `customers` source columns, and `order_feedback`.

Pending Phase 2 migrations (apply separately, in order):

1. `20261106000000_customer_source_tracking`
2. `20261110000000_order_feedback`

Insights source/feedback panels need those columns/tables; order sales metrics work without them (sources/feedback empty or error if columns missing).

## 10. Tests

See vitest suites `insights-range` and `insights-stats` (sales filter, AOV zero-safe, tenant scoping, Cambodia custom bounds, daily zero fill, source/feedback aggregates).

## 11. Known limitations

- COD “collected” is not modeled; non-cancelled COD counts as sales.
- ABA `submitted` counts as sales before admin verification.
- No refunds in schema.
- New/returning first-order uses **any** status (aligned with dashboard `findFirstOrdersByCustomerIds`), while period activity requires non-cancelled.
- Dashboard on this branch does not yet show Total Sales; Insights does — definitions documented here, not silently backported.
- No EN/KM localization layer on this branch.
- Trend chart is CSS bars (no chart library).
- No CSV export, product-level analytics, or cohort retention.

## 12. Deferred

- Profit / COGS, refund accounting, payment settlement reports.
- Product / SKU insights, funnel analytics, multi-touch attribution.
- Scheduled emailed reports, third-party BI sync.
- Editing historical attribution or feedback from Insights.

## 13. Deployment prerequisites

1. Apply pending migrations (`customer_source_tracking`, then `order_feedback`) on the target database.
2. Deploy this branch.
3. Confirm Admin → Insights loads for a tenant admin; verify cards against known orders.
4. Do not run destructive cleanup scripts; leave `scripts/cleanup-kin-a2-test-data.ts` out of production deploys unless intentionally adopted.
