import { z } from "zod";

/** Customer storefront locales for this release. Chinese is intentionally omitted. */
export const LOCALES = ["en", "km"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "en";

export const LOCALE_COOKIE_NAME = "commerceos_locale";
export const LOCALE_COOKIE_MAX_AGE = 60 * 60 * 24 * 365; // 1 year

export const localeSchema = z.enum(LOCALES);

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (LOCALES as readonly string[]).includes(value);
}

/**
 * Map any stored/requested value to EN or KM.
 * Unknown values (including legacy `zh`) fall back to English.
 */
export function parseLocale(value: string | null | undefined): Locale {
  const normalized = value?.trim().toLowerCase();
  if (normalized === "km" || normalized === "kh") {
    return "km";
  }
  if (normalized === "en") {
    return "en";
  }
  return DEFAULT_LOCALE;
}

/** Map Telegram `language_code` to a CommerceOS locale (initial hint only). */
export function localeFromTelegramLanguageCode(
  languageCode: string | null | undefined,
): Locale {
  return parseLocale(languageCode);
}
