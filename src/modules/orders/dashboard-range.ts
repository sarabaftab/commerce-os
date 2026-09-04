export const DASHBOARD_RANGES = [7, 14, 28] as const;

export type DashboardRangeDays = (typeof DASHBOARD_RANGES)[number];

export const DEFAULT_DASHBOARD_RANGE: DashboardRangeDays = 7;

export function parseDashboardRange(
  raw: string | string[] | undefined,
): DashboardRangeDays {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "14") {
    return 14;
  }
  if (value === "28") {
    return 28;
  }
  return 7;
}

export function dashboardRangeLabel(days: DashboardRangeDays): string {
  return `Past ${days} Days`;
}

/** Inclusive rolling window: [now - days, now]. */
export function dashboardRangeStart(
  days: DashboardRangeDays,
  now: Date = new Date(),
): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}
