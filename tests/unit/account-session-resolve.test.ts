import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  readCustomerSessionFromCookies,
  verifyTelegramAccountAccess,
  headersMock,
} = vi.hoisted(() => ({
  readCustomerSessionFromCookies: vi.fn(),
  verifyTelegramAccountAccess: vi.fn(),
  headersMock: vi.fn(),
}));

vi.mock("@/channels/telegram/server/customer-session", () => ({
  readCustomerSessionFromCookies,
}));

vi.mock("@/channels/telegram/server/account-access", () => ({
  verifyTelegramAccountAccess,
}));

vi.mock("next/headers", () => ({
  headers: headersMock,
}));

describe("getOptionalCustomerSession precedence", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.resetModules();
    headersMock.mockResolvedValue({
      get: (name: string) =>
        name === "x-commerceos-tg-account-access" ? "proof-code" : null,
    });
  });

  it("prefers a valid cookie session over a Telegram access proof", async () => {
    readCustomerSessionFromCookies.mockResolvedValueOnce({
      tenantId: "tenant-a",
      customerId: "cust-cookie",
      sessionId: "sess-cookie",
      channel: "telegram",
    });

    const { getOptionalCustomerSession } = await import(
      "@/modules/customers/services/customer-auth"
    );
    const session = await getOptionalCustomerSession("tenant-a");

    expect(session).toEqual({
      tenantId: "tenant-a",
      customerId: "cust-cookie",
      sessionId: "sess-cookie",
      channel: "telegram",
      resolvedVia: "cookie",
    });
    expect(verifyTelegramAccountAccess).not.toHaveBeenCalled();
  });

  it("falls back to a verified Telegram access proof when cookie is absent", async () => {
    readCustomerSessionFromCookies.mockResolvedValueOnce(null);
    verifyTelegramAccountAccess.mockResolvedValueOnce({
      tenantId: "tenant-a",
      customerId: "cust-proof",
      sessionId: "sess-proof",
    });

    const { getOptionalCustomerSession } = await import(
      "@/modules/customers/services/customer-auth"
    );
    const session = await getOptionalCustomerSession("tenant-a");

    expect(verifyTelegramAccountAccess).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      code: "proof-code",
    });
    expect(session).toEqual({
      tenantId: "tenant-a",
      customerId: "cust-proof",
      sessionId: "sess-proof",
      channel: "telegram",
      resolvedVia: "telegram_access_proof",
    });
  });

  it("returns null for browser visitors without cookie or proof", async () => {
    readCustomerSessionFromCookies.mockResolvedValueOnce(null);
    headersMock.mockResolvedValueOnce({ get: () => null });
    verifyTelegramAccountAccess.mockResolvedValueOnce(null);

    const { getOptionalCustomerSession } = await import(
      "@/modules/customers/services/customer-auth"
    );
    await expect(getOptionalCustomerSession("tenant-a")).resolves.toBeNull();
  });
});
