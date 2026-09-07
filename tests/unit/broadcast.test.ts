import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  getTelegramBotTokenForTenantSlugOrNull,
  getTelegramBroadcastChannelOrNull,
  sendTelegramChannelBroadcast,
} = vi.hoisted(() => ({
  getTelegramBotTokenForTenantSlugOrNull: vi.fn(),
  getTelegramBroadcastChannelOrNull: vi.fn(),
  sendTelegramChannelBroadcast: vi.fn(),
}));

vi.mock("@/channels/telegram/server/bot-config", () => ({
  getTelegramBotTokenForTenantSlugOrNull,
  getTelegramBroadcastChannelOrNull,
}));

vi.mock("@/channels/telegram/server/telegram-bot-api", async () => {
  const actual = await vi.importActual<typeof import("@/channels/telegram/server/telegram-bot-api")>(
    "@/channels/telegram/server/telegram-bot-api",
  );
  return {
    ...actual,
    sendTelegramChannelBroadcast,
  };
});

vi.mock("@/shared/config/env", () => ({
  env: () => ({
    NEXT_PUBLIC_APP_URL: "https://shop.example",
    TELEGRAM_TENANT_SLUG: "kin-a2",
  }),
}));

import { mapTelegramBroadcastError } from "@/channels/telegram/server/telegram-bot-api";
import { broadcastInputSchema } from "@/modules/broadcasts/schemas/broadcast";
import {
  publishTelegramBroadcast,
  resolveBroadcastButtonUrl,
} from "@/modules/broadcasts/services/broadcast-service";

describe("broadcast validation", () => {
  it("rejects empty messages", () => {
    const parsed = broadcastInputSchema.safeParse({
      message: "   ",
      buttonLabel: "",
      buttonDestination: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("requires a label when destination is set", () => {
    const parsed = broadcastInputSchema.safeParse({
      message: "Hello channel",
      buttonLabel: "",
      buttonDestination: "/products",
    });
    expect(parsed.success).toBe(false);
  });
});

describe("broadcast CTA destination", () => {
  it("defaults blank destination to the tenant storefront", () => {
    expect(
      resolveBroadcastButtonUrl({
        tenantSlug: "kin-a2",
        buttonLabel: "Shop Now",
        buttonDestination: "",
      }),
    ).toEqual({
      text: "Shop Now",
      url: "https://shop.example/kin-a2",
    });
  });

  it("resolves relative product paths under the tenant", () => {
    expect(
      resolveBroadcastButtonUrl({
        tenantSlug: "kin-a2",
        buttonLabel: "View product",
        buttonDestination: "/products/fresh-milk",
      }),
    ).toEqual({
      text: "View product",
      url: "https://shop.example/kin-a2/products/fresh-milk",
    });
  });

  it("accepts https destinations and rejects http", () => {
    expect(
      resolveBroadcastButtonUrl({
        tenantSlug: "kin-a2",
        buttonLabel: "Open",
        buttonDestination: "https://example.com/promo",
      })?.url,
    ).toBe("https://example.com/promo");

    expect(() =>
      resolveBroadcastButtonUrl({
        tenantSlug: "kin-a2",
        buttonLabel: "Open",
        buttonDestination: "http://example.com/promo",
      }),
    ).toThrow(/HTTPS/);
  });
});

describe("publishTelegramBroadcast", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getTelegramBroadcastChannelOrNull.mockReturnValue("@billioncocambodia");
    getTelegramBotTokenForTenantSlugOrNull.mockReturnValue("123:ABC");
    sendTelegramChannelBroadcast.mockResolvedValue({ ok: true, messageId: 42 });
  });

  it("publishes once to the configured channel with CTA", async () => {
    const result = await publishTelegramBroadcast({
      tenantId: "tenant-a",
      tenantSlug: "kin-a2",
      adminUserId: "admin-1",
      data: {
        message: "New product available",
        buttonLabel: "Shop Now",
        buttonDestination: "",
      },
    });

    expect(result).toEqual({ channel: "@billioncocambodia", messageId: 42 });
    expect(sendTelegramChannelBroadcast).toHaveBeenCalledTimes(1);
    expect(sendTelegramChannelBroadcast).toHaveBeenCalledWith({
      botToken: "123:ABC",
      channel: "@billioncocambodia",
      text: "New product available",
      button: { text: "Shop Now", url: "https://shop.example/kin-a2" },
    });
  });

  it("resolves channel from tenant context, not client input", async () => {
    getTelegramBroadcastChannelOrNull.mockReturnValue(null);

    await expect(
      publishTelegramBroadcast({
        tenantId: "tenant-b",
        tenantSlug: "other-tenant",
        adminUserId: "admin-1",
        data: { message: "Should not publish", buttonLabel: "", buttonDestination: "" },
      }),
    ).rejects.toThrow(/not configured/);

    expect(sendTelegramChannelBroadcast).not.toHaveBeenCalled();
  });

  it("maps Telegram API failures to safe Admin copy", async () => {
    sendTelegramChannelBroadcast.mockResolvedValue({
      ok: false,
      errorCode: "403:Forbidden: bot is not a member of the channel chat",
    });

    await expect(
      publishTelegramBroadcast({
        tenantId: "tenant-a",
        tenantSlug: "kin-a2",
        adminUserId: "admin-1",
        data: { message: "Hello", buttonLabel: "", buttonDestination: "" },
      }),
    ).rejects.toThrow(/administrator with permission to post/);

    expect(mapTelegramBroadcastError("403:Forbidden")).toContain("administrator");
    expect(mapTelegramBroadcastError("network")).not.toMatch(/token|bot\d+/i);
  });
});
