import {
  parsePhoneNumberFromString,
  type CountryCode,
} from "libphonenumber-js/core";
import metadata from "libphonenumber-js/metadata.max.json";

/** Default country for local Cambodian numbers (leading 0 / national format). */
export const DEFAULT_PHONE_COUNTRY: CountryCode = "KH";

function parsePhone(input: string, defaultCountry?: CountryCode) {
  return defaultCountry
    ? parsePhoneNumberFromString(input, defaultCountry, metadata)
    : parsePhoneNumberFromString(input, metadata);
}

/**
 * Digits-only strip. Prefer {@link normalizePhoneToE164} for identity matching.
 * Kept for admin search digit extraction and legacy fallbacks.
 */
export function stripPhoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/**
 * Parse a phone into canonical E.164 when confidently valid.
 * Returns null when the number cannot be trusted for identity matching.
 */
export function normalizePhoneToE164(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string | null {
  const trimmed = phone.trim();
  if (!trimmed) {
    return null;
  }

  const parsed = parsePhone(trimmed, defaultCountry);
  if (!parsed || !parsed.isValid()) {
    return null;
  }

  return parsed.number;
}

/**
 * Normalize for persistence after validation.
 * Prefers E.164; falls back to digits-only for unusual-but-accepted inputs
 * so we never invent a match against another customer's number.
 */
export function normalizePhone(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string {
  return normalizePhoneToE164(phone, defaultCountry) ?? stripPhoneDigits(phone);
}

/**
 * Validation used by checkout/profile/address schemas.
 * Accepts libphonenumber-valid numbers (KH default), or a lenient 8–15 digit
 * fallback so unusual-but-legitimate entries are not rejected too aggressively.
 */
export function isValidPhone(
  phone: string,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): boolean {
  if (normalizePhoneToE164(phone, defaultCountry)) {
    return true;
  }
  const digits = stripPhoneDigits(phone);
  return digits.length >= 8 && digits.length <= 15;
}

/**
 * Customer/admin-facing display. Cambodian numbers prefer national format
 * (e.g. "012 345 678"). Falls back to the stored value on failure.
 */
export function formatPhoneForDisplay(
  phone: string | null | undefined,
  defaultCountry: CountryCode = DEFAULT_PHONE_COUNTRY,
): string {
  if (!phone) {
    return "";
  }
  const trimmed = phone.trim();
  if (!trimmed) {
    return "";
  }

  const parsed = parsePhone(trimmed, defaultCountry) ?? parsePhone(trimmed);

  if (!parsed) {
    return trimmed;
  }

  try {
    return parsed.formatNational();
  } catch {
    return trimmed;
  }
}

/** Legacy phone string variants that may exist before backfill. */
export function phoneLookupVariants(e164: string): string[] {
  const digits = stripPhoneDigits(e164);
  const variants = new Set<string>([e164, digits]);

  if (digits.startsWith("855") && digits.length > 3) {
    const national = digits.slice(3);
    variants.add(national);
    variants.add(`0${national}`);
    variants.add(`855${national}`);
    variants.add(`+855${national}`);
  }

  return [...variants];
}
