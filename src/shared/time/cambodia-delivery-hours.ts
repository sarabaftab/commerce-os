/** Business timezone for KIN delivery operating hours. */
export const CAMBODIA_TIMEZONE = "Asia/Phnom_Penh";

/** Inclusive start hour (08:00). */
export const DELIVERY_HOURS_START_HOUR = 8;

/** Exclusive end hour (20:00). */
export const DELIVERY_HOURS_END_HOUR = 20;

export type CambodiaClockTime = {
  hour: number;
  minute: number;
};

/**
 * Read hour/minute in Asia/Phnom_Penh for a given instant.
 * Does not use browser, Vercel, or UTC wall-clock hours directly.
 */
export function getCambodiaClockTime(now: Date = new Date()): CambodiaClockTime {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: CAMBODIA_TIMEZONE,
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(now);

  const hour = Number(parts.find((part) => part.type === "hour")?.value);
  const minute = Number(parts.find((part) => part.type === "minute")?.value);

  if (!Number.isInteger(hour) || !Number.isInteger(minute)) {
    throw new Error("Unable to resolve Cambodia clock time");
  }

  return { hour, minute };
}

/**
 * Delivery operating hours: 08:00 inclusive – 20:00 exclusive (Asia/Phnom_Penh).
 */
export function isWithinCambodiaDeliveryHours(now: Date = new Date()): boolean {
  const { hour, minute } = getCambodiaClockTime(now);
  const minutesOfDay = hour * 60 + minute;
  const start = DELIVERY_HOURS_START_HOUR * 60;
  const end = DELIVERY_HOURS_END_HOUR * 60;
  return minutesOfDay >= start && minutesOfDay < end;
}

export function isOutsideCambodiaDeliveryHours(now: Date = new Date()): boolean {
  return !isWithinCambodiaDeliveryHours(now);
}
