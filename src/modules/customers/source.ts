/** Stored source kinds. Null in the database means unattributed. */
export const CUSTOMER_SOURCE_KINDS = ["telegram_campaign", "referral", "marketing"] as const;

export type CustomerSourceKind = (typeof CUSTOMER_SOURCE_KINDS)[number];

export type ParsedCustomerSource = {
  kind: CustomerSourceKind;
  key: string;
};

const SOURCE_KEY = /^[A-Za-z0-9_-]{1,64}$/;

const PREFIXES: ReadonlyArray<readonly [string, CustomerSourceKind]> = [
  ["referral_", "referral"],
  ["ref_", "referral"],
  ["mkt_", "marketing"],
  ["src_", "marketing"],
];

/**
 * Parse a Telegram `start_param` that was already HMAC-verified inside initData.
 * Returns null for missing or malformed values. Never throws.
 *
 * Prefixes (lowercase):
 * - `ref_` / `referral_` → referral
 * - `mkt_` / `src_` → marketing
 * - any other `[A-Za-z0-9_-]{1,64}` token → telegram campaign
 */
export function parseTelegramStartParam(
  raw: string | null | undefined,
): ParsedCustomerSource | null {
  if (typeof raw !== "string") {
    return null;
  }
  const value = raw.trim();
  if (!value || value.length > 64) {
    return null;
  }

  const lower = value.toLowerCase();
  for (const [prefix, kind] of PREFIXES) {
    if (!lower.startsWith(prefix)) {
      continue;
    }
    const key = value.slice(prefix.length);
    if (!SOURCE_KEY.test(key)) {
      return null;
    }
    return { kind, key };
  }

  if (!SOURCE_KEY.test(value)) {
    return null;
  }
  return { kind: "telegram_campaign", key: value };
}

/** Admin label. Missing or unrecognized data is Unknown — never guessed. */
export function customerSourceLabel(
  kind: string | null | undefined,
  key: string | null | undefined,
): string {
  const safeKey = key?.trim();
  if (!safeKey) {
    return "Unknown";
  }
  if (kind === "referral") {
    return `Referral · ${safeKey}`;
  }
  if (kind === "marketing") {
    return `Marketing · ${safeKey}`;
  }
  if (kind === "telegram_campaign") {
    return `Telegram · ${safeKey}`;
  }
  return "Unknown";
}

export function customerSourceKindLabel(kind: string | null | undefined): string {
  if (kind === "referral") {
    return "Referral";
  }
  if (kind === "marketing") {
    return "Marketing";
  }
  if (kind === "telegram_campaign") {
    return "Telegram";
  }
  return "Unknown";
}
