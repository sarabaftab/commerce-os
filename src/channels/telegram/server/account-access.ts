import { createHash, randomBytes } from "node:crypto";

import {
  TELEGRAM_ACCOUNT_ACCESS_QUERY,
  TELEGRAM_ACCOUNT_ACCESS_TTL_MS,
} from "@/channels/telegram/account-access-constants";
import { prisma } from "@/shared/db/prisma";

export {
  TELEGRAM_ACCOUNT_ACCESS_HEADER,
  TELEGRAM_ACCOUNT_ACCESS_QUERY,
  TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY,
  TELEGRAM_ACCOUNT_ACCESS_TTL_MS,
} from "@/channels/telegram/account-access-constants";

function hashAccessCode(code: string): string {
  return createHash("sha256").update(code).digest("hex");
}

/**
 * Create an opaque Account access proof after Telegram initData was verified.
 * The URL/sessionStorage value is NOT a session token.
 */
export async function createTelegramAccountAccess(input: {
  tenantId: string;
  customerId: string;
  sessionId: string;
}): Promise<string> {
  const code = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + TELEGRAM_ACCOUNT_ACCESS_TTL_MS);

  await prisma.telegramAccountAccess.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      sessionId: input.sessionId,
      codeHash: hashAccessCode(code),
      expiresAt,
    },
  });

  return code;
}

export type TelegramAccountAccessPayload = {
  tenantId: string;
  customerId: string;
  sessionId: string;
};

/**
 * Validate a multi-use Account access proof for this tenant.
 * Rejects unknown, expired, and cross-tenant codes.
 */
export async function verifyTelegramAccountAccess(input: {
  tenantId: string;
  code: string | null | undefined;
}): Promise<TelegramAccountAccessPayload | null> {
  const code = input.code?.trim();
  if (!code) {
    return null;
  }

  const row = await prisma.telegramAccountAccess.findUnique({
    where: { codeHash: hashAccessCode(code) },
  });

  if (!row) {
    return null;
  }
  if (row.tenantId !== input.tenantId) {
    return null;
  }
  if (row.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  const session = await prisma.customerSession.findFirst({
    where: {
      id: row.sessionId,
      tenantId: input.tenantId,
      customerId: row.customerId,
    },
  });
  if (!session || session.expiresAt.getTime() <= Date.now()) {
    return null;
  }

  return {
    tenantId: row.tenantId,
    customerId: row.customerId,
    sessionId: row.sessionId,
  };
}

export function appendTelegramAccountAccessQuery(path: string, code: string): string {
  const [pathname, existingQuery = ""] = path.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set(TELEGRAM_ACCOUNT_ACCESS_QUERY, code);
  const query = params.toString();
  return query ? `${pathname}?${query}` : pathname;
}
