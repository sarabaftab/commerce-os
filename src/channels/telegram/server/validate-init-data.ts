import { createHmac, timingSafeEqual } from "node:crypto";

import { AppError } from "@/shared/errors/app-error";

export type TelegramWebAppUser = {
  id: number;
  first_name?: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
  photo_url?: string;
};

export type ValidatedTelegramInitData = {
  user: TelegramWebAppUser;
  authDate: Date;
  startParam?: string;
  queryId?: string;
  raw: Record<string, string>;
};

function parseInitData(initData: string): Map<string, string> {
  const params = new Map<string, string>();
  const search = new URLSearchParams(initData);
  for (const [key, value] of search.entries()) {
    params.set(key, value);
  }
  return params;
}

function buildDataCheckString(params: Map<string, string>): string {
  return [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
}

function hmacHex(key: Buffer | string, data: string): string {
  return createHmac("sha256", key).update(data).digest("hex");
}

function safeEqualHex(a: string, b: string): boolean {
  try {
    const aBuf = Buffer.from(a, "hex");
    const bBuf = Buffer.from(b, "hex");
    if (aBuf.length !== bBuf.length) {
      return false;
    }
    return timingSafeEqual(aBuf, bBuf);
  } catch {
    return false;
  }
}

/**
 * Validate Telegram Mini App `initData` per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function validateTelegramInitData(
  initData: string,
  botToken: string,
  options?: { maxAgeSeconds?: number; now?: Date },
): ValidatedTelegramInitData {
  const trimmed = initData.trim();
  if (!trimmed) {
    throw new AppError("UNAUTHORIZED", "Missing Telegram init data");
  }
  if (!botToken) {
    throw new AppError("INTERNAL", "Telegram bot token is not configured");
  }

  const params = parseInitData(trimmed);
  const hash = params.get("hash");
  if (!hash) {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram init data");
  }

  const dataCheckString = buildDataCheckString(params);
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const calculated = hmacHex(secretKey, dataCheckString);

  if (!safeEqualHex(calculated, hash)) {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram init data signature");
  }

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw || !/^\d+$/.test(authDateRaw)) {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram auth_date");
  }

  const authDateSeconds = Number(authDateRaw);
  const authDate = new Date(authDateSeconds * 1000);
  const now = options?.now ?? new Date();
  const maxAgeSeconds = options?.maxAgeSeconds ?? 300;
  const ageSeconds = Math.floor((now.getTime() - authDate.getTime()) / 1000);

  if (ageSeconds < -60) {
    throw new AppError("UNAUTHORIZED", "Telegram auth_date is in the future");
  }
  if (ageSeconds > maxAgeSeconds) {
    throw new AppError("UNAUTHORIZED", "Telegram init data has expired");
  }

  const userRaw = params.get("user");
  if (!userRaw) {
    throw new AppError("UNAUTHORIZED", "Telegram user is missing from init data");
  }

  let user: TelegramWebAppUser;
  try {
    user = JSON.parse(userRaw) as TelegramWebAppUser;
  } catch {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram user payload");
  }

  if (!user || typeof user.id !== "number" || !Number.isFinite(user.id)) {
    throw new AppError("UNAUTHORIZED", "Invalid Telegram user id");
  }

  const raw: Record<string, string> = {};
  for (const [key, value] of params.entries()) {
    raw[key] = value;
  }

  return {
    user,
    authDate,
    startParam: params.get("start_param") || undefined,
    queryId: params.get("query_id") || undefined,
    raw,
  };
}

export function telegramDisplayName(user: TelegramWebAppUser): string {
  const parts = [user.first_name, user.last_name].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  if (user.username) {
    return `@${user.username}`;
  }
  return `Telegram ${user.id}`;
}
