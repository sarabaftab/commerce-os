export const DASHBOARD_RANGES = [7, 14, 28] as const;

export type DashboardRangeDays = (typeof DASHBOARD_RANGES)[number];

export const DEFAULT_DASHBOARD_RANGE: DashboardRangeDays = 7;

const DATE_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;

export type DashboardWindow = {
  kind: "preset" | "custom";
  /** Preset day count; null when using a custom calendar range. */
  rangeDays: DashboardRangeDays | null;
  from: Date;
  /** Inclusive end; null for presets (open-ended through now). */
  to: Date | null;
  label: string;
  /** YYYY-MM-DD when kind is custom — kept for URL / poll round-trips. */
  fromParam: string | null;
  toParam: string | null;
};

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

/** Inclusive rolling window start: now - days. */
export function dashboardRangeStart(
  days: DashboardRangeDays,
  now: Date = new Date(),
): Date {
  return new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
}

export function isValidDashboardDateParam(raw: string): boolean {
  if (!DATE_PARAM_RE.test(raw)) {
    return false;
  }
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  // Reject impossible calendar dates (e.g. 2026-02-31).
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

/** Start of UTC calendar day for a YYYY-MM-DD param. */
export function startOfUtcDayFromParam(raw: string): Date {
  const [year, month, day] = raw.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 0, 0, 0, 0));
}

/** End of UTC calendar day for a YYYY-MM-DD param (inclusive). */
export function endOfUtcDayFromParam(raw: string): Date {
  const [year, month, day] = raw.split("-").map(Number);
  return new Date(Date.UTC(year, month - 1, day, 23, 59, 59, 999));
}

/**
 * Parse a custom From/To pair. Returns null when either date is missing/invalid
 * or From is after To.
 */
export function parseCustomDashboardRange(
  fromRaw: string,
  toRaw: string,
): DashboardWindow | null {
  const fromParam = fromRaw.trim();
  const toParam = toRaw.trim();
  if (!isValidDashboardDateParam(fromParam) || !isValidDashboardDateParam(toParam)) {
    return null;
  }
  if (fromParam > toParam) {
    return null;
  }
  return {
    kind: "custom",
    rangeDays: null,
    from: startOfUtcDayFromParam(fromParam),
    to: endOfUtcDayFromParam(toParam),
    label: `${fromParam} → ${toParam}`,
    fromParam,
    toParam,
  };
}

export function dashboardWindowFromPreset(
  days: DashboardRangeDays,
  now: Date = new Date(),
): DashboardWindow {
  return {
    kind: "preset",
    rangeDays: days,
    from: dashboardRangeStart(days, now),
    to: null,
    label: dashboardRangeLabel(days),
    fromParam: null,
    toParam: null,
  };
}

type DashboardWindowParams = {
  range?: string | string[] | null;
  from?: string | string[] | null;
  to?: string | string[] | null;
};

function pickParam(raw: string | string[] | null | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

/**
 * Resolve dashboard window from URL/search params.
 * Valid custom from+to wins; otherwise falls back to preset range days.
 */
export function resolveDashboardWindow(
  params: DashboardWindowParams,
  now: Date = new Date(),
): DashboardWindow {
  const fromRaw = pickParam(params.from).trim();
  const toRaw = pickParam(params.to).trim();
  if (fromRaw || toRaw) {
    const custom = parseCustomDashboardRange(fromRaw, toRaw);
    if (custom) {
      return custom;
    }
  }
  return dashboardWindowFromPreset(parseDashboardRange(pickParam(params.range)), now);
}

/** Prisma `placedAt` filter for the resolved window. */
export function dashboardPlacedAtFilter(window: DashboardWindow): {
  gte: Date;
  lte?: Date;
} {
  if (window.to) {
    return { gte: window.from, lte: window.to };
  }
  return { gte: window.from };
}

/** Stable remount / poll key for the selected window. */
export function dashboardWindowKey(window: DashboardWindow): string {
  if (window.kind === "custom") {
    return `custom:${window.fromParam}:${window.toParam}`;
  }
  return `preset:${window.rangeDays}`;
}
