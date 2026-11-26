import { cambodiaDateKey, startOfCambodiaDayFromParam } from "@/shared/time/format-cambodia";

/** Provisional default when enabling reminders; not applied while disabled. */
export const PROVISIONAL_REORDER_REMINDER_INTERVAL_DAYS = 14;

export const REORDER_REMINDER_MIN_INTERVAL_DAYS = 7;
export const REORDER_REMINDER_MAX_INTERVAL_DAYS = 90;

export type ReorderEligibilityInput = {
  now: Date;
  intervalDays: number;
  lastCompletedOrderPlacedAt: Date | null;
  lastSuccessfulReminderSentAt: Date | null;
  hasTelegramIdentity: boolean;
  tenantReorderRemindersEnabled: boolean;
  tenantTelegramOrderNotificationsEnabled: boolean;
  customerDeleted: boolean;
};

export type ReorderEligibilityDecision =
  | { eligible: true; sourceCutoff: Date }
  | { eligible: false; reason: string };

/**
 * A customer is eligible when:
 * - tenant has reorder reminders enabled
 * - tenant has not disabled Telegram order notifications (existing quiet switch)
 * - customer is active and Telegram-linked
 * - latest completed order is at least `intervalDays` Cambodia calendar days old
 * - no successful reminder was sent within the same interval window
 */
export function evaluateReorderEligibility(
  input: ReorderEligibilityInput,
): ReorderEligibilityDecision {
  if (!input.tenantReorderRemindersEnabled) {
    return { eligible: false, reason: "reminders_disabled" };
  }
  if (!input.tenantTelegramOrderNotificationsEnabled) {
    return { eligible: false, reason: "telegram_notifications_disabled" };
  }
  if (input.customerDeleted) {
    return { eligible: false, reason: "customer_deleted" };
  }
  if (!input.hasTelegramIdentity) {
    return { eligible: false, reason: "no_telegram_identity" };
  }
  if (!input.lastCompletedOrderPlacedAt) {
    return { eligible: false, reason: "no_completed_order" };
  }

  const intervalDays = clampIntervalDays(input.intervalDays);
  const sourceCutoff = reorderSourceCutoff(input.now, intervalDays);

  if (input.lastCompletedOrderPlacedAt.getTime() > sourceCutoff.getTime()) {
    return { eligible: false, reason: "order_too_recent" };
  }

  if (input.lastSuccessfulReminderSentAt) {
    const reminderCutoff = reorderSourceCutoff(input.now, intervalDays);
    if (input.lastSuccessfulReminderSentAt.getTime() > reminderCutoff.getTime()) {
      return { eligible: false, reason: "reminded_recently" };
    }
  }

  return { eligible: true, sourceCutoff };
}

export function clampIntervalDays(raw: number): number {
  if (!Number.isFinite(raw)) {
    return PROVISIONAL_REORDER_REMINDER_INTERVAL_DAYS;
  }
  const rounded = Math.trunc(raw);
  return Math.min(
    REORDER_REMINDER_MAX_INTERVAL_DAYS,
    Math.max(REORDER_REMINDER_MIN_INTERVAL_DAYS, rounded),
  );
}

/** Instant at start of (today − intervalDays) in Asia/Phnom_Penh. */
export function reorderSourceCutoff(now: Date, intervalDays: number): Date {
  const todayKey = cambodiaDateKey(now);
  const todayStart = startOfCambodiaDayFromParam(todayKey);
  const ms = clampIntervalDays(intervalDays) * 24 * 60 * 60 * 1000;
  return new Date(todayStart.getTime() - ms);
}
