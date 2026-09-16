import { afterEach, describe, expect, it, vi } from "vitest";

import {
  formatTelegramSupportUsernameInput,
  openTelegramHttpsLink,
  parseTelegramSupportUsername,
  telegramSupportChatUrl,
} from "@/channels/telegram/support-link";

describe("parseTelegramSupportUsername", () => {
  it("accepts @username and bare username", () => {
    expect(parseTelegramSupportUsername("@BillionSupport")).toBe("BillionSupport");
    expect(parseTelegramSupportUsername("BillionSupport")).toBe("BillionSupport");
    expect(parseTelegramSupportUsername("  @jane_shop  ")).toBe("jane_shop");
  });

  it("extracts a username from a t.me chat URL", () => {
    expect(parseTelegramSupportUsername("https://t.me/BillionSupport")).toBe("BillionSupport");
    expect(parseTelegramSupportUsername("t.me/BillionSupport")).toBe("BillionSupport");
  });

  it("treats empty input as missing", () => {
    expect(parseTelegramSupportUsername("")).toBeNull();
    expect(parseTelegramSupportUsername("   ")).toBeNull();
    expect(parseTelegramSupportUsername(null)).toBeNull();
    expect(parseTelegramSupportUsername(undefined)).toBeNull();
  });

  it("rejects malformed or unsafe destinations", () => {
    expect(parseTelegramSupportUsername("ab")).toBeNull();
    expect(parseTelegramSupportUsername("12345")).toBeNull();
    expect(parseTelegramSupportUsername("https://example.com/BillionSupport")).toBeNull();
    expect(parseTelegramSupportUsername("https://t.me/joinchat/AAAA")).toBeNull();
    expect(parseTelegramSupportUsername("https://t.me/+invitehash")).toBeNull();
    expect(parseTelegramSupportUsername("https://t.me/BillionSupport/extra")).toBeNull();
    expect(parseTelegramSupportUsername("123456789:AAHfakebottoken")).toBeNull();
  });
});

describe("telegramSupportChatUrl", () => {
  it("builds a t.me chat URL from a valid username", () => {
    expect(telegramSupportChatUrl("@BillionSupport")).toBe("https://t.me/BillionSupport");
  });

  it("does not emit a link when configuration is missing or invalid", () => {
    expect(telegramSupportChatUrl(null)).toBeNull();
    expect(telegramSupportChatUrl("https://evil.test")).toBeNull();
  });
});

describe("formatTelegramSupportUsernameInput", () => {
  it("prefixes a stored username with @", () => {
    expect(formatTelegramSupportUsernameInput("BillionSupport")).toBe("@BillionSupport");
    expect(formatTelegramSupportUsernameInput(null)).toBe("");
  });
});

describe("openTelegramHttpsLink", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("uses Telegram.WebApp.openTelegramLink for a safe t.me chat URL", () => {
    const openTelegramLink = vi.fn();
    const open = vi.fn();
    vi.stubGlobal("window", {
      Telegram: { WebApp: { openTelegramLink } },
      open,
    });

    expect(openTelegramHttpsLink("https://t.me/BillionSupport")).toBe(true);
    expect(openTelegramLink).toHaveBeenCalledWith("https://t.me/BillionSupport");
    expect(open).not.toHaveBeenCalled();
  });

  it("refuses a non-Telegram URL", () => {
    const openTelegramLink = vi.fn();
    vi.stubGlobal("window", {
      Telegram: { WebApp: { openTelegramLink } },
      open: vi.fn(),
    });

    expect(openTelegramHttpsLink("https://example.com")).toBe(false);
    expect(openTelegramLink).not.toHaveBeenCalled();
  });
});
