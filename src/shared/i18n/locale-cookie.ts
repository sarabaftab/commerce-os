import type { Locale } from "./locale";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE_MAX_AGE,
  LOCALE_COOKIE_NAME,
  parseLocale,
} from "./locale";

/** Backup when document.cookie is flaky inside Telegram WebView. */
export const LOCALE_STORAGE_KEY = "commerceos_locale";

export function buildLocaleCookieHeader(locale: Locale): string {
  const parts = [
    `${LOCALE_COOKIE_NAME}=${encodeURIComponent(locale)}`,
    "Path=/",
    "SameSite=Lax",
    `Max-Age=${LOCALE_COOKIE_MAX_AGE}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function readLocaleFromCookieHeader(cookieHeader: string | null): Locale {
  if (!cookieHeader) {
    return DEFAULT_LOCALE;
  }
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === LOCALE_COOKIE_NAME) {
      return parseLocale(decodeURIComponent(rest.join("=")));
    }
  }
  return DEFAULT_LOCALE;
}

function readLocaleFromSessionStorage(): Locale | null {
  if (typeof window === "undefined") {
    return null;
  }
  try {
    const raw = window.sessionStorage.getItem(LOCALE_STORAGE_KEY);
    if (!raw) {
      return null;
    }
    return parseLocale(raw);
  } catch {
    return null;
  }
}

function writeLocaleSessionStorage(locale: Locale) {
  if (typeof window === "undefined") {
    return;
  }
  try {
    window.sessionStorage.setItem(LOCALE_STORAGE_KEY, locale);
  } catch {
    // Private mode / quota — cookie remains primary.
  }
}

/**
 * Client source of truth: cookie first, then sessionStorage backup.
 * Never returns blank; unknown values fall back to English.
 */
export function readLocaleFromDocumentCookie(): Locale {
  if (typeof document === "undefined") {
    return DEFAULT_LOCALE;
  }
  const fromCookie = readLocaleFromCookieHeader(document.cookie);
  if (document.cookie.includes(`${LOCALE_COOKIE_NAME}=`)) {
    return fromCookie;
  }
  return readLocaleFromSessionStorage() ?? DEFAULT_LOCALE;
}

export function writeLocaleDocumentCookie(locale: Locale) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = buildLocaleCookieHeader(locale);
  writeLocaleSessionStorage(locale);
}
