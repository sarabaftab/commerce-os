import { env } from "@/shared/config/env";
import { AppError } from "@/shared/errors/app-error";

/**
 * Phase 1: one bot token mapped to a single tenant slug via env.
 * Tenant for requests still comes from the URL slug; the bot token is only
 * used when the slug matches TELEGRAM_TENANT_SLUG.
 */
export function getTelegramBotTokenForTenantSlug(tenantSlug: string): string {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_TENANT_SLUG } = env();

  if (!TELEGRAM_BOT_TOKEN) {
    throw new AppError("INTERNAL", "TELEGRAM_BOT_TOKEN is not configured");
  }

  if (tenantSlug !== TELEGRAM_TENANT_SLUG) {
    throw new AppError(
      "FORBIDDEN",
      `Telegram is not enabled for tenant "${tenantSlug}"`,
    );
  }

  return normalizeTelegramBotToken(TELEGRAM_BOT_TOKEN);
}

/**
 * BotFather tokens look like `123456789:AAH…`.
 * Only strip a `bot` prefix when it is the API URL prefix (`bot<id>:<secret>`),
 * not when the secret itself happens to contain those letters.
 */
export function normalizeTelegramBotToken(raw: string): string {
  const token = raw.trim().replace(/^["']|["']$/g, "");
  const prefixed = /^bot(\d+:\S+)/i.exec(token);
  return prefixed?.[1] ?? token;
}

/** Returns null instead of throwing when this tenant has no bot mapping. */
export function getTelegramBotTokenForTenantSlugOrNull(tenantSlug: string): string | null {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_TENANT_SLUG } = env();
  if (!TELEGRAM_BOT_TOKEN || tenantSlug !== TELEGRAM_TENANT_SLUG) {
    return null;
  }
  return normalizeTelegramBotToken(TELEGRAM_BOT_TOKEN);
}

export function getTelegramInitDataMaxAgeSeconds(): number {
  return env().TELEGRAM_INIT_DATA_MAX_AGE_SECONDS;
}
