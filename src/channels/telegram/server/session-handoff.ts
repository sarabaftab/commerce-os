import { createHmac, timingSafeEqual } from "node:crypto";

export const TELEGRAM_SESSION_HANDOFF_QUERY = "tg_s";
const HANDOFF_TTL_MS = 120_000;

function handoffSecret(): string {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.DATABASE_URL || "commerceos-tg-handoff";
}

export function createTelegramSessionHandoff(sessionToken: string): string {
  const exp = String(Date.now() + HANDOFF_TTL_MS);
  const body = `${exp}.${sessionToken}`;
  const sig = createHmac("sha256", handoffSecret()).update(body).digest("base64url");
  return `${body}.${sig}`;
}

export function readTelegramSessionHandoff(value: string | null | undefined): string | null {
  if (!value) {
    return null;
  }
  const parts = value.split(".");
  if (parts.length !== 3) {
    return null;
  }
  const [expRaw, sessionToken, sig] = parts;
  if (!expRaw || !sessionToken || !sig) {
    return null;
  }
  const exp = Number(expRaw);
  if (!Number.isFinite(exp) || Date.now() > exp) {
    return null;
  }
  const body = `${expRaw}.${sessionToken}`;
  const expected = createHmac("sha256", handoffSecret()).update(body).digest("base64url");
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }
  return sessionToken;
}
