import { describe, expect, it } from "vitest";

import {
  DEFAULT_DASHBOARD_RANGE,
  dashboardPlacedAtFilter,
  dashboardRangeLabel,
  dashboardRangeStart,
  dashboardWindowFromPreset,
  dashboardWindowKey,
  parseCustomDashboardRange,
  parseDashboardRange,
  resolveDashboardWindow,
} from "@/modules/orders/dashboard-range";

describe("dashboard date range presets", () => {
  it("defaults invalid values to 7 days", () => {
    expect(parseDashboardRange(undefined)).toBe(7);
    expect(parseDashboardRange("")).toBe(7);
    expect(parseDashboardRange("99")).toBe(7);
    expect(parseDashboardRange(["nope"])).toBe(7);
    expect(DEFAULT_DASHBOARD_RANGE).toBe(7);
  });

  it("parses supported ranges (7 / 14 / 28)", () => {
    expect(parseDashboardRange("7")).toBe(7);
    expect(parseDashboardRange("14")).toBe(14);
    expect(parseDashboardRange("28")).toBe(28);
  });

  it("computes rolling windows from now", () => {
    const now = new Date("2026-09-04T18:00:00.000Z");
    expect(dashboardRangeStart(7, now).toISOString()).toBe("2026-08-28T18:00:00.000Z");
    expect(dashboardRangeStart(14, now).toISOString()).toBe("2026-08-21T18:00:00.000Z");
    expect(dashboardRangeStart(28, now).toISOString()).toBe("2026-08-07T18:00:00.000Z");
  });

  it("labels ranges for the UI", () => {
    expect(dashboardRangeLabel(7)).toBe("Past 7 Days");
    expect(dashboardRangeLabel(14)).toBe("Past 14 Days");
    expect(dashboardRangeLabel(28)).toBe("Past 28 Days");
  });
});

describe("custom dashboard date range", () => {
  it("accepts a valid from/to inclusive UTC day window", () => {
    const window = parseCustomDashboardRange("2026-09-01", "2026-09-14");
    expect(window).not.toBeNull();
    expect(window?.kind).toBe("custom");
    expect(window?.from.toISOString()).toBe("2026-09-01T00:00:00.000Z");
    expect(window?.to?.toISOString()).toBe("2026-09-14T23:59:59.999Z");
    expect(window?.label).toBe("2026-09-01 → 2026-09-14");
    expect(dashboardPlacedAtFilter(window!)).toEqual({
      gte: window!.from,
      lte: window!.to!,
    });
  });

  it("accepts a same-day range", () => {
    const window = parseCustomDashboardRange("2026-09-10", "2026-09-10");
    expect(window?.from.toISOString()).toBe("2026-09-10T00:00:00.000Z");
    expect(window?.to?.toISOString()).toBe("2026-09-10T23:59:59.999Z");
  });

  it("rejects From after To", () => {
    expect(parseCustomDashboardRange("2026-09-14", "2026-09-01")).toBeNull();
  });

  it("rejects missing or invalid dates", () => {
    expect(parseCustomDashboardRange("", "2026-09-01")).toBeNull();
    expect(parseCustomDashboardRange("2026-09-01", "")).toBeNull();
    expect(parseCustomDashboardRange("2026-02-31", "2026-03-01")).toBeNull();
    expect(parseCustomDashboardRange("not-a-date", "2026-09-01")).toBeNull();
  });

  it("resolveDashboardWindow prefers valid custom over preset", () => {
    const window = resolveDashboardWindow({
      range: "14",
      from: "2026-08-01",
      to: "2026-08-31",
    });
    expect(window.kind).toBe("custom");
    expect(window.fromParam).toBe("2026-08-01");
    expect(window.toParam).toBe("2026-08-31");
    expect(dashboardWindowKey(window)).toBe("custom:2026-08-01:2026-08-31");
  });

  it("falls back to preset when custom is invalid", () => {
    const window = resolveDashboardWindow({
      range: "28",
      from: "2026-09-14",
      to: "2026-09-01",
    });
    expect(window.kind).toBe("preset");
    expect(window.rangeDays).toBe(28);
  });

  it("preset placedAt filter stays open-ended (gte only)", () => {
    const window = dashboardWindowFromPreset(7, new Date("2026-09-14T12:00:00.000Z"));
    expect(dashboardPlacedAtFilter(window)).toEqual({ gte: window.from });
    expect(dashboardPlacedAtFilter(window).lte).toBeUndefined();
  });
});

describe("dashboard live poll interval", () => {
  it("uses a 10–15 second quiet refresh window", async () => {
    const { DASHBOARD_POLL_INTERVAL_MS } = await import(
      "@/modules/orders/dashboard-live"
    );
    expect(DASHBOARD_POLL_INTERVAL_MS).toBeGreaterThanOrEqual(10_000);
    expect(DASHBOARD_POLL_INTERVAL_MS).toBeLessThanOrEqual(15_000);
  });
});

describe("orders filter reset defaults", () => {
  it("treats an empty query as the default unfiltered orders state", async () => {
    const { parseOrderAdminListSearchParams } = await import(
      "@/modules/orders/schemas/order-admin"
    );

    const defaults = parseOrderAdminListSearchParams({});
    expect(defaults).toEqual({
      q: "",
      status: "",
      paymentMethod: "",
      fulfillmentMethod: "",
      from: "",
      to: "",
      page: 1,
      pageSize: 20,
    });
  });

  it("parses every filter so Reset can clear the full URL surface", async () => {
    const { parseOrderAdminListSearchParams } = await import(
      "@/modules/orders/schemas/order-admin"
    );

    const filtered = parseOrderAdminListSearchParams({
      q: "nasa",
      status: "pending",
      paymentMethod: "aba_transfer",
      fulfillmentMethod: "delivery",
      from: "2026-08-01",
      to: "2026-08-31",
      page: "3",
    });

    expect(filtered.q).toBe("nasa");
    expect(filtered.status).toBe("pending");
    expect(filtered.paymentMethod).toBe("aba_transfer");
    expect(filtered.fulfillmentMethod).toBe("delivery");
    expect(filtered.from).toBe("2026-08-01");
    expect(filtered.to).toBe("2026-08-31");
    expect(filtered.page).toBe(3);
  });
});
