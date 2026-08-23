import { describe, expect, it } from "vitest";

import { normalizeTelegramBotToken } from "@/channels/telegram/server/bot-config";
import { AppError } from "@/shared/errors/app-error";

/**
 * Mirrors Phase 1 bot→tenant gating without loading full env (which requires DB URLs).
 */
function assertTelegramTenantAllowed(
  requestSlug: string,
  configuredSlug: string,
  botToken: string | undefined,
) {
  if (!botToken) {
    throw new AppError("INTERNAL", "TELEGRAM_BOT_TOKEN is not configured");
  }
  if (requestSlug !== configuredSlug) {
    throw new AppError(
      "FORBIDDEN",
      `Telegram is not enabled for tenant "${requestSlug}"`,
    );
  }
}

describe("Telegram tenant isolation (Phase 1)", () => {
  it("allows matching tenant slug", () => {
    expect(() =>
      assertTelegramTenantAllowed("kin-a2", "kin-a2", "token"),
    ).not.toThrow();
  });

  it("rejects other tenant slugs", () => {
    expect(() =>
      assertTelegramTenantAllowed("other-shop", "kin-a2", "token"),
    ).toThrow(/not enabled/i);
  });

  it("requires bot token", () => {
    expect(() =>
      assertTelegramTenantAllowed("kin-a2", "kin-a2", undefined),
    ).toThrow(/not configured/i);
  });
});

describe("normalizeTelegramBotToken", () => {
  it("keeps a normal BotFather token", () => {
    expect(normalizeTelegramBotToken("123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw")).toBe(
      "123456789:AAHdqTcvCH1vGWJxfSeofSAs0K5PALDsaw",
    );
  });

  it("strips only an API bot prefix before the numeric id", () => {
    expect(normalizeTelegramBotToken("bot123456789:AAHsecret")).toBe("123456789:AAHsecret");
  });

  it("does not slice a token that merely starts with the letters bot", () => {
    expect(normalizeTelegramBotToken("botsecret:not-a-real-id")).toBe("botsecret:not-a-real-id");
  });
});
