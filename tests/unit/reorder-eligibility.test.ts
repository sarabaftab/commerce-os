import { describe, expect, it } from "vitest";

import {
  clampIntervalDays,
  evaluateReorderEligibility,
  reorderSourceCutoff,
} from "@/modules/notifications/reorder-eligibility";

describe("reorder eligibility", () => {
  const now = new Date("2026-11-25T12:00:00.000Z"); // 19:00 ICT

  it("clamps interval days to 7–90", () => {
    expect(clampIntervalDays(3)).toBe(7);
    expect(clampIntervalDays(14)).toBe(14);
    expect(clampIntervalDays(120)).toBe(90);
  });

  it("computes Cambodia calendar cutoffs independent of UTC wall clock", () => {
    // 2026-11-25 ICT minus 14 days → start of 2026-11-11 ICT = 2026-11-10T17:00:00.000Z
    const cutoff = reorderSourceCutoff(now, 14);
    expect(cutoff.toISOString()).toBe("2026-11-10T17:00:00.000Z");
  });

  it("requires tenant enablement and telegram notification preference", () => {
    const base = {
      now,
      intervalDays: 14,
      lastCompletedOrderPlacedAt: new Date("2026-10-01T00:00:00.000Z"),
      lastSuccessfulReminderSentAt: null,
      hasTelegramIdentity: true,
      tenantReorderRemindersEnabled: true,
      tenantTelegramOrderNotificationsEnabled: true,
      customerDeleted: false,
    };

    expect(evaluateReorderEligibility(base).eligible).toBe(true);
    expect(
      evaluateReorderEligibility({
        ...base,
        tenantReorderRemindersEnabled: false,
      }),
    ).toEqual({ eligible: false, reason: "reminders_disabled" });
    expect(
      evaluateReorderEligibility({
        ...base,
        tenantTelegramOrderNotificationsEnabled: false,
      }),
    ).toEqual({ eligible: false, reason: "telegram_notifications_disabled" });
  });

  it("rejects customers without telegram, deleted accounts, or recent orders", () => {
    const base = {
      now,
      intervalDays: 14,
      lastCompletedOrderPlacedAt: new Date("2026-10-01T00:00:00.000Z"),
      lastSuccessfulReminderSentAt: null,
      hasTelegramIdentity: true,
      tenantReorderRemindersEnabled: true,
      tenantTelegramOrderNotificationsEnabled: true,
      customerDeleted: false,
    };

    expect(
      evaluateReorderEligibility({ ...base, hasTelegramIdentity: false }),
    ).toEqual({ eligible: false, reason: "no_telegram_identity" });
    expect(
      evaluateReorderEligibility({ ...base, customerDeleted: true }),
    ).toEqual({ eligible: false, reason: "customer_deleted" });
    expect(
      evaluateReorderEligibility({
        ...base,
        lastCompletedOrderPlacedAt: new Date("2026-11-20T00:00:00.000Z"),
      }),
    ).toEqual({ eligible: false, reason: "order_too_recent" });
  });

  it("prevents duplicate reminders inside the interval window", () => {
    const decision = evaluateReorderEligibility({
      now,
      intervalDays: 14,
      lastCompletedOrderPlacedAt: new Date("2026-10-01T00:00:00.000Z"),
      lastSuccessfulReminderSentAt: new Date("2026-11-20T01:00:00.000Z"),
      hasTelegramIdentity: true,
      tenantReorderRemindersEnabled: true,
      tenantTelegramOrderNotificationsEnabled: true,
      customerDeleted: false,
    });
    expect(decision).toEqual({ eligible: false, reason: "reminded_recently" });
  });
});
