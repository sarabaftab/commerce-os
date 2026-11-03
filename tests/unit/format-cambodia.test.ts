import { describe, expect, it } from "vitest";

import {
  CAMBODIA_TIMEZONE,
  endOfCambodiaDayFromParam,
  formatDateInCambodia,
  formatDateTimeInCambodia,
  startOfCambodiaDayFromParam,
} from "@/shared/time/format-cambodia";

describe("format Cambodia timestamps", () => {
  it("uses Asia/Phnom_Penh", () => {
    expect(CAMBODIA_TIMEZONE).toBe("Asia/Phnom_Penh");
  });

  it("formats a UTC instant as Cambodia local wall time", () => {
    // 2026-09-14 05:30 UTC → 12:30 in Phnom Penh
    const instant = new Date("2026-09-14T05:30:00.000Z");
    expect(formatDateTimeInCambodia(instant)).toContain("12:30");
    expect(formatDateInCambodia(instant)).toMatch(/14/);
  });

  it("does not follow the machine timezone — only Asia/Phnom_Penh", () => {
    const instant = new Date("2026-01-01T00:00:00.000Z"); // 07:00 Cambodia
    expect(formatDateTimeInCambodia(instant)).toContain("07:00");
  });
});

describe("Cambodia calendar day bounds", () => {
  it("maps YYYY-MM-DD to UTC+7 midnight and end-of-day", () => {
    expect(startOfCambodiaDayFromParam("2026-09-01").toISOString()).toBe(
      "2026-08-31T17:00:00.000Z",
    );
    expect(endOfCambodiaDayFromParam("2026-09-14").toISOString()).toBe(
      "2026-09-14T16:59:59.999Z",
    );
  });
});
