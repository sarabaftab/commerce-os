import {
  endOfCambodiaDayFromParam,
  startOfCambodiaDayFromParam,
} from "@/shared/time/format-cambodia";

export const INSIGHTS_PRESETS = [7, 30] as const;
export type InsightsPresetDays = (typeof INSIGHTS_PRESETS)[number];
export const DEFAULT_INSIGHTS_PRESET: InsightsPresetDays = 30;

/** Prevent unbounded custom queries. */
export const INSIGHTS_MAX_RANGE_DAYS = 366;

const DATE_PARAM_RE = /^\d{4}-\d{2}-\d{2}$/;

export type InsightsWindow = {
  kind: "preset" | "custom";
  /** Preset day count; null for custom. */
  rangeDays: InsightsPresetDays | null;
  from: Date;
  to: Date;
  label: string;
  fromParam: string | null;
  toParam: string | null;
  /** Daily buckets for ≤30 calendar days; weekly otherwise. */
  trendGrain: "day" | "week";
};

export function isValidInsightsDateParam(raw: string): boolean {
  if (!DATE_PARAM_RE.test(raw)) {
    return false;
  }
  const [year, month, day] = raw.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  if (Number.isNaN(date.getTime())) {
    return false;
  }
  return (
    date.getUTCFullYear() === year &&
    date.getUTCMonth() === month - 1 &&
    date.getUTCDate() === day
  );
}

function cambodiaCalendarDayCount(fromParam: string, toParam: string): number {
  const from = startOfCambodiaDayFromParam(fromParam).getTime();
  const to = startOfCambodiaDayFromParam(toParam).getTime();
  return Math.floor((to - from) / (24 * 60 * 60 * 1000)) + 1;
}

function trendGrainForCalendarDays(days: number): "day" | "week" {
  return days <= 30 ? "day" : "week";
}

export function insightsWindowFromPreset(
  days: InsightsPresetDays,
  now: Date = new Date(),
): InsightsWindow {
  const to = now;
  const from = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return {
    kind: "preset",
    rangeDays: days,
    from,
    to,
    label: `Last ${days} days`,
    fromParam: null,
    toParam: null,
    trendGrain: trendGrainForCalendarDays(days),
  };
}

export function parseCustomInsightsRange(
  fromRaw: string,
  toRaw: string,
): InsightsWindow | null {
  const fromParam = fromRaw.trim();
  const toParam = toRaw.trim();
  if (!isValidInsightsDateParam(fromParam) || !isValidInsightsDateParam(toParam)) {
    return null;
  }
  if (fromParam > toParam) {
    return null;
  }
  const dayCount = cambodiaCalendarDayCount(fromParam, toParam);
  if (dayCount < 1 || dayCount > INSIGHTS_MAX_RANGE_DAYS) {
    return null;
  }
  return {
    kind: "custom",
    rangeDays: null,
    from: startOfCambodiaDayFromParam(fromParam),
    to: endOfCambodiaDayFromParam(toParam),
    label: `${fromParam} → ${toParam}`,
    fromParam,
    toParam,
    trendGrain: trendGrainForCalendarDays(dayCount),
  };
}

function pickParam(raw: string | string[] | null | undefined): string {
  if (Array.isArray(raw)) {
    return raw[0] ?? "";
  }
  return raw ?? "";
}

export function parseInsightsPreset(
  raw: string | string[] | undefined,
): InsightsPresetDays {
  const value = Array.isArray(raw) ? raw[0] : raw;
  if (value === "7") {
    return 7;
  }
  return 30;
}

/**
 * Resolve Insights window from URL params.
 * Valid custom from+to wins; otherwise preset (default 30).
 */
export function resolveInsightsWindow(
  params: {
    range?: string | string[] | null;
    from?: string | string[] | null;
    to?: string | string[] | null;
  },
  now: Date = new Date(),
): InsightsWindow {
  const fromRaw = pickParam(params.from).trim();
  const toRaw = pickParam(params.to).trim();
  if (fromRaw || toRaw) {
    const custom = parseCustomInsightsRange(fromRaw, toRaw);
    if (custom) {
      return custom;
    }
  }
  return insightsWindowFromPreset(parseInsightsPreset(pickParam(params.range)), now);
}

export function insightsPlacedAtFilter(window: InsightsWindow): {
  gte: Date;
  lte: Date;
} {
  return { gte: window.from, lte: window.to };
}
