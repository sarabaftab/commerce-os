import { createHash, randomBytes } from "node:crypto";

import { prisma } from "@/shared/db/prisma";

export const TELEGRAM_SESSION_HANDOFF_QUERY = "tg_s";

/** Short-lived one-time exchange code for Desktop document cookie handoff. */
export const TELEGRAM_SESSION_HANDOFF_TTL_MS = 120_000;

function hashHandoffCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Create an opaque one-time handoff code. The URL value is NOT the customer
 * session token — only a random code whose hash is stored server-side.
 */
export async function createTelegramSessionHandoff(input: {
  tenantId: string;
  sessionId: string;
}): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TELEGRAM_SESSION_HANDOFF_TTL_MS);

  await prisma.telegramSessionHandoff.create({
    data: {
      tenantId: input.tenantId,
      sessionId: input.sessionId,
      codeHash: hashHandoffCode(code),
      expiresAt,
    },
  });

  return code;
}

/**
 * Atomically consume a handoff code for this tenant and return a fresh
 * session cookie token for the referenced CustomerSession (token rotated).
 * Invalid, expired, reused, or cross-tenant codes return null.
 */
export async function consumeTelegramSessionHandoff(input: {
  tenantId: string;
  code: string | null | undefined;
}): Promise<string | null> {
  const code = input.code?.trim();
  if (!code) {
    return null;
  }

  const codeHash = hashHandoffCode(code);
  const now = new Date();

  return prisma.$transaction(async (tx) => {
    const row = await tx.telegramSessionHandoff.findUnique({
      where: { codeHash },
    });

    if (!row) {
      return null;
    }
    if (row.tenantId !== input.tenantId) {
      return null;
    }
    if (row.consumedAt) {
      return null;
    }
    if (row.expiresAt.getTime() <= now.getTime()) {
      return null;
    }

    const claimed = await tx.telegramSessionHandoff.updateMany({
      where: { id: row.id, consumedAt: null },
      data: { consumedAt: now },
    });
    if (claimed.count !== 1) {
      return null;
    }

    const session = await tx.customerSession.findFirst({
      where: { id: row.sessionId, tenantId: input.tenantId },
    });
    if (!session || session.expiresAt.getTime() <= now.getTime()) {
      return null;
    }

    const token = randomBytes(32).toString("base64url");
    await tx.customerSession.update({
      where: { id: session.id },
      data: {
        tokenHash: hashSessionToken(token),
        lastSeenAt: now,
      },
    });

    return token;
  });
}
