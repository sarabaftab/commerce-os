import { AppError } from "@/shared/errors/app-error";

export type RateLimitConfig = {
  /** Max successful takes inside the window. */
  limit: number;
  /** Window length in milliseconds. */
  windowMs: number;
};

type Bucket = {
  count: number;
  resetAt: number;
};

const buckets = new Map<string, Bucket>();

/** AUD-008 defaults — in-memory per serverless isolate (still useful). */
export const RATE_LIMITS = {
  locationSearch: { limit: 30, windowMs: 60_000 } satisfies RateLimitConfig,
  checkout: { limit: 20, windowMs: 60_000 } satisfies RateLimitConfig,
  telegramAuth: { limit: 30, windowMs: 60_000 } satisfies RateLimitConfig,
} as const;

/**
 * Fixed-window counter. Throws AppError RATE_LIMIT (429) when exceeded.
 */
export function assertRateLimit(key: string, config: RateLimitConfig): void {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + config.windowMs });
    return;
  }

  if (existing.count >= config.limit) {
    throw new AppError(
      "RATE_LIMIT",
      "Too many requests. Please try again shortly.",
    );
  }

  existing.count += 1;
}

export function getClientIp(request: Request): string {
  const forwarded = request.headers.get("x-forwarded-for");
  if (forwarded) {
    const first = forwarded.split(",")[0]?.trim();
    if (first) return first;
  }
  const realIp = request.headers.get("x-real-ip")?.trim();
  if (realIp) return realIp;
  return "unknown";
}

/** Best-effort Telegram user id from initData for rate-limit keys only (not auth). */
export function telegramUserIdFromInitData(initData: string): string | null {
  try {
    const userRaw = new URLSearchParams(initData).get("user");
    if (!userRaw) return null;
    const parsed = JSON.parse(userRaw) as { id?: unknown };
    if (typeof parsed.id === "number" || typeof parsed.id === "string") {
      return String(parsed.id);
    }
    return null;
  } catch {
    return null;
  }
}

/** Test helper — clears all buckets. */
export function resetRateLimitStoreForTests(): void {
  buckets.clear();
}
