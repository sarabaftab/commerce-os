import { describe, expect, it } from "vitest";

import {
  CAMBODIA_TIMEZONE,
  getCambodiaClockTime,
  isOutsideCambodiaDeliveryHours,
  isWithinCambodiaDeliveryHours,
} from "@/shared/time/cambodia-delivery-hours";

/** Build a UTC Date that maps to the given Cambodia local wall time on a fixed calendar day. */
function cambodiaLocalAsUtc(hour: number, minute: number): Date {
  // Cambodia is UTC+7 year-round (no DST).
  const utcHour = hour - 7;
  return new Date(Date.UTC(2026, 0, 15, utcHour, minute, 0));
}

describe("Cambodia delivery operating hours", () => {
  it("uses Asia/Phnom_Penh", () => {
    expect(CAMBODIA_TIMEZONE).toBe("Asia/Phnom_Penh");
  });

  it("resolves Cambodia clock parts from an absolute instant", () => {
    const noonUtc = new Date("2026-01-15T05:00:00.000Z"); // 12:00 in Phnom Penh
    expect(getCambodiaClockTime(noonUtc)).toEqual({ hour: 12, minute: 0 });
  });

  it.each([
    { label: "07:59", hour: 7, minute: 59, inside: false },
    { label: "08:00", hour: 8, minute: 0, inside: true },
    { label: "12:00", hour: 12, minute: 0, inside: true },
    { label: "19:59", hour: 19, minute: 59, inside: true },
    { label: "20:00", hour: 20, minute: 0, inside: false },
    { label: "23:00", hour: 23, minute: 0, inside: false },
  ])("$label Cambodia → inside=$inside", ({ hour, minute, inside }) => {
    const now = cambodiaLocalAsUtc(hour, minute);
    expect(getCambodiaClockTime(now)).toEqual({ hour, minute });
    expect(isWithinCambodiaDeliveryHours(now)).toBe(inside);
    expect(isOutsideCambodiaDeliveryHours(now)).toBe(!inside);
  });

  it("outside-hours flag is display-only (order actions do not import the helper)", async () => {
    const fs = await import("node:fs/promises");
    const path = await import("node:path");
    const root = path.join(process.cwd(), "src/modules/orders");
    const gatedFiles = [
      "actions/checkout-actions.ts",
      "services/checkout-service.ts",
      "services/order-service.ts",
      "components/checkout-form.tsx",
    ];
    for (const relative of gatedFiles) {
      const source = await fs.readFile(path.join(root, relative), "utf8");
      expect(source).not.toMatch(/cambodia-delivery-hours|isOutsideCambodiaDeliveryHours|isWithinCambodiaDeliveryHours/);
    }
    // Helper still reports outside at 20:00 — notice may show, but checkout remains ungated.
    expect(isOutsideCambodiaDeliveryHours(cambodiaLocalAsUtc(20, 0))).toBe(true);
  });
});
