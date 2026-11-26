import { timingSafeEqual } from "node:crypto";

/**
 * Authorize Vercel Cron (or manual) invocations.
 * Prefer `Authorization: Bearer ${CRON_SECRET}` (Vercel sets this when CRON_SECRET is configured).
 * Also accepts `x-vercel-cron: 1` only when CRON_SECRET is unset in non-production (local smoke).
 */
export function authorizeCronRequest(request: Request):
  | { ok: true }
  | { ok: false; status: number; message: string } {
  const secret = process.env.CRON_SECRET?.trim();
  const auth = request.headers.get("authorization");

  if (secret) {
    const expected = `Bearer ${secret}`;
    if (!auth || !safeEqual(auth, expected)) {
      return { ok: false, status: 401, message: "Unauthorized" };
    }
    return { ok: true };
  }

  if (process.env.NODE_ENV === "production") {
    return {
      ok: false,
      status: 503,
      message: "CRON_SECRET is required in production",
    };
  }

  // Local/dev without a secret: allow explicit vercel-cron header or ?dryRun for smoke tests.
  if (request.headers.get("x-vercel-cron") === "1") {
    return { ok: true };
  }

  return { ok: false, status: 401, message: "Unauthorized" };
}

function safeEqual(a: string, b: string): boolean {
  const left = Buffer.from(a);
  const right = Buffer.from(b);
  if (left.length !== right.length) {
    return false;
  }
  return timingSafeEqual(left, right);
}
