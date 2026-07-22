import { createHmac } from "node:crypto";

import { describe, expect, it } from "vitest";

import { AppError } from "@/shared/errors/app-error";
import {
  telegramDisplayName,
  validateTelegramInitData,
} from "@/channels/telegram/server/validate-init-data";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

function signInitData(pairs: Record<string, string>, botToken = BOT_TOKEN): string {
  const params = new URLSearchParams(pairs);
  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(botToken).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

describe("validateTelegramInitData", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");
  const authDate = String(Math.floor(now.getTime() / 1000) - 30);

  it("accepts valid initData and returns user", () => {
    const user = JSON.stringify({
      id: 42,
      first_name: "Ada",
      last_name: "Lovelace",
      username: "ada",
    });
    const initData = signInitData({
      auth_date: authDate,
      user,
      start_param: "ref_abc",
    });

    const result = validateTelegramInitData(initData, BOT_TOKEN, {
      maxAgeSeconds: 300,
      now,
    });

    expect(result.user.id).toBe(42);
    expect(result.startParam).toBe("ref_abc");
    expect(telegramDisplayName(result.user)).toBe("Ada Lovelace");
  });

  it("rejects tampered hash", () => {
    const initData = signInitData({
      auth_date: authDate,
      user: JSON.stringify({ id: 1, first_name: "A" }),
    });
    const tampered = initData.replace(/hash=[0-9a-f]+/, "hash=" + "0".repeat(64));

    expect(() =>
      validateTelegramInitData(tampered, BOT_TOKEN, { maxAgeSeconds: 300, now }),
    ).toThrow(AppError);
  });

  it("rejects expired auth_date", () => {
    const oldAuth = String(Math.floor(now.getTime() / 1000) - 1000);
    const initData = signInitData({
      auth_date: oldAuth,
      user: JSON.stringify({ id: 7, first_name: "Old" }),
    });

    expect(() =>
      validateTelegramInitData(initData, BOT_TOKEN, { maxAgeSeconds: 300, now }),
    ).toThrow(/expired/i);
  });

  it("rejects missing user", () => {
    const initData = signInitData({ auth_date: authDate });
    expect(() =>
      validateTelegramInitData(initData, BOT_TOKEN, { maxAgeSeconds: 300, now }),
    ).toThrow(AppError);
  });
});

describe("telegramDisplayName", () => {
  it("prefers first + last name", () => {
    expect(
      telegramDisplayName({ id: 1, first_name: "Kin", last_name: "Milk" }),
    ).toBe("Kin Milk");
  });

  it("falls back to username", () => {
    expect(telegramDisplayName({ id: 1, username: "kin" })).toBe("@kin");
  });
});
