import { CAMBODIA_TIMEZONE } from "./cambodia-delivery-hours";

export { CAMBODIA_TIMEZONE };

const DATE_TIME_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: CAMBODIA_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  hourCycle: "h23",
};

const DATE_OPTIONS: Intl.DateTimeFormatOptions = {
  timeZone: CAMBODIA_TIMEZONE,
  year: "numeric",
  month: "short",
  day: "numeric",
};

function asDate(value: Date | string | number): Date {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error("Invalid date");
  }
  return date;
}

/**
 * Format an absolute instant for Admin UI in Asia/Phnom_Penh.
 * Independent of the administrator's browser timezone.
 */
export function formatDateTimeInCambodia(value: Date | string | number): string {
  return new Intl.DateTimeFormat("en-GB", DATE_TIME_OPTIONS).format(asDate(value));
}

/** Calendar date only in Asia/Phnom_Penh. */
export function formatDateInCambodia(value: Date | string | number): string {
  return new Intl.DateTimeFormat("en-GB", DATE_OPTIONS).format(asDate(value));
}

/**
 * Start of a Cambodia calendar day (YYYY-MM-DD) as a UTC Date.
 * Cambodia is UTC+7 year-round (no DST).
 */
export function startOfCambodiaDayFromParam(raw: string): Date {
  return new Date(`${raw}T00:00:00+07:00`);
}

/** Inclusive end of a Cambodia calendar day (YYYY-MM-DD) as a UTC Date. */
export function endOfCambodiaDayFromParam(raw: string): Date {
  return new Date(`${raw}T23:59:59.999+07:00`);
}
