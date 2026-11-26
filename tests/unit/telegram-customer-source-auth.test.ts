import { createHmac } from "node:crypto";

import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

const BOT_TOKEN = "123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11";

const { recordFirstTouchCustomerSource, findUnique, updateIdentity, createCustomerSession } =
  vi.hoisted(() => ({
    recordFirstTouchCustomerSource: vi.fn(),
    findUnique: vi.fn(),
    updateIdentity: vi.fn(),
    createCustomerSession: vi.fn(async () => ({
      token: "session-token",
      sessionId: "session-1",
      expiresAt: new Date("2026-12-01T00:00:00.000Z"),
    })),
  }));

vi.mock("@/modules/customers/services/customer-source-service", () => ({
  recordFirstTouchCustomerSource,
}));

vi.mock("@/channels/telegram/server/bot-config", () => ({
  getTelegramBotTokenForTenantSlug: () => BOT_TOKEN,
  getTelegramInitDataMaxAgeSeconds: () => 300,
}));

vi.mock("@/channels/telegram/server/customer-session", () => ({
  createCustomerSession,
  attachAttributionCookie: vi.fn(),
  attachCustomerSessionCookie: vi.fn(),
  setCustomerSessionCookie: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    customerIdentity: { findUnique, update: updateIdentity },
    customer: { update: vi.fn() },
  },
}));

import { authenticateTelegramInitData } from "@/channels/telegram/server/auth-service";

function signInitData(pairs: Record<string, string>): string {
  const params = new URLSearchParams(pairs);
  const dataCheckString = [...params.entries()]
    .filter(([key]) => key !== "hash")
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([key, value]) => `${key}=${value}`)
    .join("\n");
  const secretKey = createHmac("sha256", "WebAppData").update(BOT_TOKEN).digest();
  const hash = createHmac("sha256", secretKey).update(dataCheckString).digest("hex");
  params.set("hash", hash);
  return params.toString();
}

const now = new Date("2026-11-06T12:00:00.000Z");

function initData(startParam?: string) {
  const pairs: Record<string, string> = {
    auth_date: String(Math.floor(now.getTime() / 1000) - 10),
    user: JSON.stringify({ id: 42, first_name: "Ada" }),
  };
  if (startParam !== undefined) {
    pairs.start_param = startParam;
  }
  return signInitData(pairs);
}

describe("authenticateTelegramInitData source capture", () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  beforeEach(() => {
    vi.clearAllMocks();
    vi.useFakeTimers();
    vi.setSystemTime(now);
    findUnique.mockResolvedValue({
      id: "ident-1",
      customerId: "cust-1",
      customer: {
        id: "cust-1",
        deletedAt: null,
        displayName: "Ada",
      },
    });
    recordFirstTouchCustomerSource.mockResolvedValue(true);
    updateIdentity.mockResolvedValue({});
  });

  it("passes a valid campaign start_param through without changing auth", async () => {
    const result = await authenticateTelegramInitData({
      tenantId: "tenant-a",
      tenantSlug: "kin-a2",
      initData: initData("summer_sale"),
    });

    expect(result.result.customerId).toBe("cust-1");
    expect(result.result.tenantId).toBe("tenant-a");
    expect(result.sessionToken).toBe("session-token");
    expect(recordFirstTouchCustomerSource).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      customerId: "cust-1",
      startParam: "summer_sale",
    });
  });

  it("still signs the customer in when no start_param is present", async () => {
    const result = await authenticateTelegramInitData({
      tenantId: "tenant-a",
      tenantSlug: "kin-a2",
      initData: initData(),
    });

    expect(result.result.customerId).toBe("cust-1");
    expect(recordFirstTouchCustomerSource).not.toHaveBeenCalled();
  });

  it("still signs the customer in when source recording fails", async () => {
    recordFirstTouchCustomerSource.mockRejectedValue(new Error("column missing"));

    const result = await authenticateTelegramInitData({
      tenantId: "tenant-a",
      tenantSlug: "kin-a2",
      initData: initData("summer_sale"),
    });

    expect(result.result.customerId).toBe("cust-1");
    expect(result.sessionToken).toBe("session-token");
  });
});
