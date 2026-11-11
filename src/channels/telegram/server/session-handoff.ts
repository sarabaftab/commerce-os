import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/shared/db/prisma";

/** Query param carrying a one-time handoff code (never the session token). */
export const TELEGRAM_SESSION_HANDOFF_QUERY = "tg_s";
const HANDOFF_TTL_MS = 120_000;

function hashCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * AUD-003: Store the session token server-side and return a random one-time code
 * for the URL. No HMAC / hardcoded secret fallbacks.
 */
export async function createTelegramSessionHandoff(sessionToken: string): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  await prisma.telegramSessionHandoff.create({
    data: {
      codeHash: hashCode(code),
      sessionToken,
      expiresAt: new Date(Date.now() + HANDOFF_TTL_MS),
    },
  });
  return code;
}

/**
 * Consume a one-time handoff code. Returns the session token once; later calls get null.
 */
export async function consumeTelegramSessionHandoff(
  code: string | null | undefined,
): Promise<string | null> {
  if (!code?.trim()) {
    return null;
  }

  const codeHash = hashCode(code.trim());
  const row = await prisma.telegramSessionHandoff.findUnique({
    where: { codeHash },
  });

  if (!row || row.consumedAt || row.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const consumed = await prisma.telegramSessionHandoff.updateMany({
    where: {
      id: row.id,
      consumedAt: null,
      expiresAt: { gt: new Date() },
    },
    data: { consumedAt: new Date() },
  });

  if (consumed.count !== 1) {
    return null;
  }

  return row.sessionToken;
}

/** @deprecated Use consumeTelegramSessionHandoff — kept name for older call sites/tests. */
export async function readTelegramSessionHandoff(
  value: string | null | undefined,
): Promise<string | null> {
  return consumeTelegramSessionHandoff(value);
}
