import type { Locale } from "./locale";
import { DEFAULT_LOCALE, LOCALE_COOKIE_MAX_AGE, LOCALE_COOKIE_NAME, parseLocale } from "./locale";

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

/** Client-side cookie read (cookie is intentionally not HttpOnly). */
export function readLocaleFromDocumentCookie(): Locale {
  if (typeof document === "undefined") {
    return DEFAULT_LOCALE;
  }
  return readLocaleFromCookieHeader(document.cookie);
}

export function writeLocaleDocumentCookie(locale: Locale) {
  if (typeof document === "undefined") {
    return;
  }
  document.cookie = buildLocaleCookieHeader(locale);
}
