import { describe, expect, it } from "vitest";

import {
  INSIGHTS_MAX_RANGE_DAYS,
  parseCustomInsightsRange,
  resolveInsightsWindow,
} from "@/modules/orders/insights-range";

describe("insights range", () => {
  it("defaults to last 30 days", () => {
    const now = new Date("2026-11-10T12:00:00.000Z");
    const window = resolveInsightsWindow({}, now);
    expect(window.kind).toBe("preset");
    expect(window.rangeDays).toBe(30);
    expect(window.trendGrain).toBe("day");
    expect(window.from.toISOString()).toBe("2026-10-11T12:00:00.000Z");
  });

  it("accepts last 7 days", () => {
    const window = resolveInsightsWindow({ range: "7" }, new Date("2026-11-10T12:00:00.000Z"));
    expect(window.rangeDays).toBe(7);
  });

  it("uses Cambodia calendar-day bounds for custom ranges", () => {
    const window = parseCustomInsightsRange("2026-09-01", "2026-09-14");
    expect(window).not.toBeNull();
    expect(window?.from.toISOString()).toBe("2026-08-31T17:00:00.000Z");
    expect(window?.to.toISOString()).toBe("2026-09-14T16:59:59.999Z");
    expect(window?.trendGrain).toBe("day");
  });

  it("uses weekly grain for custom ranges longer than 30 calendar days", () => {
    const window = parseCustomInsightsRange("2026-01-01", "2026-03-01");
    expect(window?.trendGrain).toBe("week");
  });

  it("rejects invalid, inverted, or oversized custom ranges", () => {
    expect(parseCustomInsightsRange("2026-02-31", "2026-03-01")).toBeNull();
    expect(parseCustomInsightsRange("2026-09-14", "2026-09-01")).toBeNull();
    expect(parseCustomInsightsRange("not-a-date", "2026-09-01")).toBeNull();
    const oversizedFrom = "2025-01-01";
    const oversizedTo = "2026-12-31";
    expect(parseCustomInsightsRange(oversizedFrom, oversizedTo)).toBeNull();
    expect(INSIGHTS_MAX_RANGE_DAYS).toBe(366);
  });

  it("falls back to preset when custom params are incomplete/invalid", () => {
    const window = resolveInsightsWindow(
      { from: "2026-09-14", to: "2026-09-01", range: "7" },
      new Date("2026-11-10T12:00:00.000Z"),
    );
    expect(window.kind).toBe("preset");
    expect(window.rangeDays).toBe(7);
  });
});
