export const TELEGRAM_SESSION_HANDOFF_QUERY = "tg_s";
const HANDOFF_TTL_MS = 120_000;

function handoffSecret(): string {
  return process.env.TELEGRAM_BOT_TOKEN || process.env.DATABASE_URL || "commerceos-tg-handoff";
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = "";
  for (const byte of bytes) {
    binary += String.fromCharCode(byte);
  }
  return btoa(binary).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromBase64Url(value: string): Uint8Array | null {
  try {
    const padded = value.replace(/-/g, "+").replace(/_/g, "/");
    const pad = padded.length % 4 === 0 ? "" : "=".repeat(4 - (padded.length % 4));
    const binary = atob(padded + pad);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i += 1) {
      bytes[i] = binary.charCodeAt(i);
    }
    return bytes;
  } catch {
    return null;
  }
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) {
    return false;
  }
  let diff = 0;
  for (let i = 0; i < a.length; i += 1) {
    diff |= a[i] ^ b[i];
  }
  return diff === 0;
}

async function hmacSha256(value: string): Promise<Uint8Array> {
  const key = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(handoffSecret()),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  const signature = await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(value));
  return new Uint8Array(signature);
}

/** Edge-safe (middleware cannot import node:crypto). */
export async function createTelegramSessionHandoff(sessionToken: string): Promise<string> {
  const exp = String(Date.now() + HANDOFF_TTL_MS);
  const body = `${exp}.${sessionToken}`;
  const sig = toBase64Url(await hmacSha256(body));
  return `${body}.${sig}`;
}

export async function readTelegramSessionHandoff(
  value: string | null | undefined,
): Promise<string | null> {
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
  const actual = fromBase64Url(sig);
  if (!actual) {
    return null;
  }
  const expected = await hmacSha256(`${expRaw}.${sessionToken}`);
  if (!timingSafeEqual(actual, expected)) {
    return null;
  }
  return sessionToken;
}
