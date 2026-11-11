/** Shared Telegram Account access proof identifiers (safe for client + server). */

export const TELEGRAM_ACCOUNT_ACCESS_QUERY = "tg_a";
export const TELEGRAM_ACCOUNT_ACCESS_HEADER = "x-commerceos-tg-account-access";
export const TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY = "commerceos_tg_account_access";

/** Multi-use within TTL — covers Account navigation after verified initData. */
export const TELEGRAM_ACCOUNT_ACCESS_TTL_MS = 30 * 60 * 1000;
