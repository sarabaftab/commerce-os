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

const DATETIME_LOCAL_RE =
  /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/;

/**
 * Parse a `<input type="datetime-local">` value as Asia/Phnom_Penh wall time.
 * Independent of the server/browser timezone (Vercel is UTC; admins may travel).
 */
export function parseCambodiaDateTimeLocal(
  raw: string | null | undefined,
): Date | null {
  const value = raw?.trim();
  if (!value) {
    return null;
  }
  const match = DATETIME_LOCAL_RE.exec(value);
  if (!match) {
    return null;
  }
  const [, year, month, day, hour, minute, second = "00"] = match;
  const date = new Date(
    `${year}-${month}-${day}T${hour}:${minute}:${second}+07:00`,
  );
  return Number.isNaN(date.getTime()) ? null : date;
}

/**
 * Format an absolute instant as `YYYY-MM-DDTHH:mm` in Asia/Phnom_Penh
 * for `<input type="datetime-local">`.
 */
export function toCambodiaDatetimeLocalValue(
  value: Date | string | number | null | undefined,
): string {
  if (value == null || value === "") {
    return "";
  }
  const date = asDate(value);
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: CAMBODIA_TIMEZONE,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);

  const get = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((part) => part.type === type)?.value ?? "";

  return `${get("year")}-${get("month")}-${get("day")}T${get("hour")}:${get("minute")}`;
}
