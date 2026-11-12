import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import {
  assertRateLimit,
  getClientIp,
  RATE_LIMITS,
  resetRateLimitStoreForTests,
  telegramUserIdFromInitData,
} from "@/shared/http/rate-limit";

/**
 * AUD-008: public write/proxy endpoints must rate-limit abusive callers.
 */
describe("AUD-008 rate limiting", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T00:00:00Z"));
  });

  afterEach(() => {
    resetRateLimitStoreForTests();
    vi.useRealTimers();
  });

  it("allows requests up to the limit then returns RATE_LIMIT", () => {
    const key = "test:location";
    const config = { limit: 3, windowMs: 60_000 };

    expect(() => assertRateLimit(key, config)).not.toThrow();
    expect(() => assertRateLimit(key, config)).not.toThrow();
    expect(() => assertRateLimit(key, config)).not.toThrow();
    expect(() => assertRateLimit(key, config)).toThrow(
      expect.objectContaining({
        code: "RATE_LIMIT",
        status: 429,
      }),
    );
  });

  it("resets after the window expires", () => {
    const key = "test:window";
    const config = { limit: 1, windowMs: 1_000 };

    expect(() => assertRateLimit(key, config)).not.toThrow();
    expect(() => assertRateLimit(key, config)).toThrow(
      expect.objectContaining({ code: "RATE_LIMIT" }),
    );

    vi.advanceTimersByTime(1_001);

    expect(() => assertRateLimit(key, config)).not.toThrow();
  });

  it("uses documented defaults for the audited endpoints", () => {
    expect(RATE_LIMITS.locationSearch.limit).toBe(30);
    expect(RATE_LIMITS.checkout.limit).toBe(20);
    expect(RATE_LIMITS.telegramAuth.limit).toBe(30);
  });

  it("reads client IP from x-forwarded-for", () => {
    const request = new Request("https://shop.test/api/location/search?q=pp", {
      headers: { "x-forwarded-for": "203.0.113.10, 10.0.0.1" },
    });
    expect(getClientIp(request)).toBe("203.0.113.10");
  });

  it("extracts telegram user id from initData for rate keys", () => {
    const initData = new URLSearchParams({
      user: JSON.stringify({ id: 4242, first_name: "Ada" }),
      auth_date: "1",
      hash: "abc",
    }).toString();
    expect(telegramUserIdFromInitData(initData)).toBe("4242");
    expect(telegramUserIdFromInitData("hash=only")).toBeNull();
  });
});
