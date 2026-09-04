import { describe, expect, it } from "vitest";

import {
  DEFAULT_DASHBOARD_RANGE,
  dashboardRangeLabel,
  dashboardRangeStart,
  parseDashboardRange,
} from "@/modules/orders/dashboard-range";

describe("dashboard date range", () => {
  it("defaults invalid values to 7 days", () => {
    expect(parseDashboardRange(undefined)).toBe(7);
    expect(parseDashboardRange("")).toBe(7);
    expect(parseDashboardRange("99")).toBe(7);
    expect(parseDashboardRange(["nope"])).toBe(7);
    expect(DEFAULT_DASHBOARD_RANGE).toBe(7);
  });

  it("parses supported ranges", () => {
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
