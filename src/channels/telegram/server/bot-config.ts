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

  return TELEGRAM_BOT_TOKEN;
}

/** Returns null instead of throwing when this tenant has no bot mapping. */
export function getTelegramBotTokenForTenantSlugOrNull(tenantSlug: string): string | null {
  const { TELEGRAM_BOT_TOKEN, TELEGRAM_TENANT_SLUG } = env();
  if (!TELEGRAM_BOT_TOKEN || tenantSlug !== TELEGRAM_TENANT_SLUG) {
    return null;
  }
  return TELEGRAM_BOT_TOKEN;
}

export function getTelegramInitDataMaxAgeSeconds(): number {
  return env().TELEGRAM_INIT_DATA_MAX_AGE_SECONDS;
}
