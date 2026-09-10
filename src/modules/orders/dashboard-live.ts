import type { DashboardRangeDays } from "@/modules/orders/dashboard-range";

/** Quiet background refresh while the Admin dashboard tab is open. */
export const DASHBOARD_POLL_INTERVAL_MS = 12_000;

/** Abort hung polls so the next interval is not blocked forever. */
export const DASHBOARD_POLL_TIMEOUT_MS = 10_000;

/**
 * Build the dashboard poll URL for the selected range.
 * Includes a cache-busting timestamp so intermediaries cannot reuse a prior GET.
 */
export function buildAdminDashboardPollUrl(
  range: DashboardRangeDays,
  nowMs: number = Date.now(),
): string {
  const params = new URLSearchParams({
    range: String(range),
    _ts: String(nowMs),
  });
  return `/api/admin/dashboard?${params.toString()}`;
}
