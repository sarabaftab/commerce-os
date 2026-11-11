import type { Locale } from "./locale";
import { DEFAULT_LOCALE } from "./locale";

function isBlank(value: string | null | undefined): boolean {
  return value == null || value.trim() === "";
}

/**
 * Pick a localized string with English fallback.
 * Never returns blank solely because a Khmer translation is missing.
 */
export function localizedValue(input: {
  locale: Locale;
  en: string;
  km?: string | null;
}): string {
  const en = input.en?.trim() ?? "";
  if (input.locale === "km" && !isBlank(input.km)) {
    return input.km!.trim();
  }
  return en;
}

/** Same helper when the English field is required non-empty by schema. */
export function localizedContent(
  locale: Locale,
  fields: { en: string; km?: string | null },
): string {
  return localizedValue({ locale, ...fields });
}

export function assertNeverBlankLocalized(value: string, fallbackEn: string): string {
  const trimmed = value.trim();
  if (trimmed) {
    return trimmed;
  }
  return fallbackEn.trim() || DEFAULT_LOCALE;
}
