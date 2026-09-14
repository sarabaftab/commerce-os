import type { DashboardWindow } from "@/modules/orders/dashboard-range";

/** Quiet background refresh while the Admin dashboard tab is open. */
export const DASHBOARD_POLL_INTERVAL_MS = 12_000;

/** Abort hung polls so the next interval is not blocked forever. */
export const DASHBOARD_POLL_TIMEOUT_MS = 10_000;

/**
 * Build the dashboard poll URL for the selected window.
 * Includes a cache-busting timestamp so intermediaries cannot reuse a prior GET.
 */
export function buildAdminDashboardPollUrl(
  window: Pick<DashboardWindow, "kind" | "rangeDays" | "fromParam" | "toParam">,
  nowMs: number = Date.now(),
): string {
  const params = new URLSearchParams({
    _ts: String(nowMs),
  });
  if (window.kind === "custom" && window.fromParam && window.toParam) {
    params.set("from", window.fromParam);
    params.set("to", window.toParam);
  } else {
    params.set("range", String(window.rangeDays ?? 7));
  }
  return `/api/admin/dashboard?${params.toString()}`;
}
