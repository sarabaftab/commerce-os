import { describe, expect, it } from "vitest";

import { customerSessionCookiePolicy } from "@/channels/telegram/server/customer-session";
import { waitForTelegramInitData } from "@/channels/telegram/client/wait-for-init-data";
import {
  parseTelegramUserId,
  telegramDisplayName,
  validateTelegramInitData,
} from "@/channels/telegram/server/validate-init-data";
import { resolveAccountAuthGate } from "@/modules/customers/account-auth-gate";
import { createHmac } from "node:crypto";

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

describe("waitForTelegramInitData", () => {
  it("returns immediately when initData is already present (returning Mini App)", () => {
    return expect(
      waitForTelegramInitData(() => "query_id=abc", { timeoutMs: 200, intervalMs: 50 }),
    ).resolves.toBe("query_id=abc");
  });

  it("waits until initData appears after ready() (first-time / iOS-style delay)", async () => {
    let value = "";
    let ticks = 0;
    const result = await waitForTelegramInitData(() => value, {
      timeoutMs: 300,
      intervalMs: 50,
      sleep: async () => {
        ticks += 1;
        if (ticks === 2) {
          value = "auth_date=1";
        }
      },
    });
    expect(result).toBe("auth_date=1");
    expect(ticks).toBeGreaterThanOrEqual(2);
  });

  it("returns null when initData never appears (browser)", async () => {
    const result = await waitForTelegramInitData(() => "", {
      timeoutMs: 80,
      intervalMs: 40,
      sleep: async () => undefined,
    });
    expect(result).toBeNull();
  });
});

describe("parseTelegramUserId", () => {
  it("accepts numeric ids", () => {
    expect(parseTelegramUserId(42)).toBe(42);
  });

  it("accepts numeric strings from some Telegram clients", () => {
    expect(parseTelegramUserId("991122")).toBe(991122);
  });

  it("rejects missing or invalid ids", () => {
    expect(parseTelegramUserId(undefined)).toBeNull();
    expect(parseTelegramUserId("abc")).toBeNull();
    expect(parseTelegramUserId(0)).toBeNull();
  });
});

describe("validateTelegramInitData missing optional Telegram fields", () => {
  const now = new Date("2026-07-22T12:00:00.000Z");
  const authDate = String(Math.floor(now.getTime() / 1000) - 30);

  it("accepts a user with only id (no name, username, photo, language, premium)", () => {
    const initData = signInitData({
      auth_date: authDate,
      user: JSON.stringify({ id: "55" }),
    });
    const result = validateTelegramInitData(initData, BOT_TOKEN, {
      maxAgeSeconds: 300,
      now,
    });
    expect(result.user.id).toBe(55);
    expect(telegramDisplayName(result.user)).toBe("Telegram 55");
  });
});

describe("resolveAccountAuthGate", () => {
  it("keeps first-time Telegram customers on a connecting state while auth loads", () => {
    expect(
      resolveAccountAuthGate({
        authStatus: "idle",
        storageReady: true,
        hardReloadAttempted: false,
      }),
    ).toBe("connecting");
    expect(
      resolveAccountAuthGate({
        authStatus: "loading",
        storageReady: true,
        hardReloadAttempted: false,
      }),
    ).toBe("connecting");
  });

  it("waits to reload until sessionStorage can be read", () => {
    expect(
      resolveAccountAuthGate({
        authStatus: "authenticated",
        storageReady: false,
        hardReloadAttempted: false,
      }),
    ).toBe("connecting");
  });

  it("reloads once after Telegram auth so Account can read the session cookie", () => {
    expect(
      resolveAccountAuthGate({
        authStatus: "authenticated",
        storageReady: true,
        hardReloadAttempted: false,
      }),
    ).toBe("refresh");
  });

  it("does not loop reload if the session cookie still did not land", () => {
    expect(
      resolveAccountAuthGate({
        authStatus: "authenticated",
        storageReady: true,
        hardReloadAttempted: true,
      }),
    ).toBe("retry");
  });

  it("sends browser visitors without a session back to the shop", () => {
    expect(
      resolveAccountAuthGate({
        authStatus: "skipped",
        storageReady: true,
        hardReloadAttempted: false,
      }),
    ).toBe("redirect-home");
  });

  it("offers a single retry on auth failure", () => {
    expect(
      resolveAccountAuthGate({
        authStatus: "error",
        storageReady: true,
        hardReloadAttempted: false,
      }),
    ).toBe("retry");
  });
});

describe("customerSessionCookiePolicy", () => {
  it("uses Lax cookies by default so Telegram Mini App matches the cart cookie", () => {
    expect(customerSessionCookiePolicy().sameSite).toBe("lax");
  });
});
