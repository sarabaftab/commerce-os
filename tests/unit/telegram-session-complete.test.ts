import { describe, expect, it, vi, beforeEach } from "vitest";

const { consumeTelegramSessionHandoff, attachCustomerSessionCookie, resolveTenantFromSlug } =
  vi.hoisted(() => ({
    consumeTelegramSessionHandoff: vi.fn(),
    attachCustomerSessionCookie: vi.fn((response: Response) => response),
    resolveTenantFromSlug: vi.fn(),
  }));

vi.mock("@/channels/telegram/server/session-handoff", () => ({
  TELEGRAM_SESSION_HANDOFF_QUERY: "tg_s",
  consumeTelegramSessionHandoff,
}));

vi.mock("@/channels/telegram/server/customer-session", () => ({
  CUSTOMER_SESSION_COOKIE: "commerceos_customer",
  attachCustomerSessionCookie,
  readCustomerSessionTokenFromRequest: () => null,
}));

vi.mock("@/channels/telegram/server/account-session-path", () => ({
  safeTelegramAccountPath: (_slug: string, next: string) => next || "/kin-a2/account",
}));

vi.mock("@/shared/cart/cart-request", () => ({
  resolveTenantFromSlug,
}));

import { GET } from "@/app/(storefront)/[tenantSlug]/telegram-session/complete/route";

describe("telegram-session complete handoff route", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    resolveTenantFromSlug.mockResolvedValue({ id: "tenant-1", slug: "kin-a2" });
  });

  it("sets the session cookie on a 200 HTML document response (not a redirect)", async () => {
    consumeTelegramSessionHandoff.mockResolvedValueOnce("session-token");

    const response = await GET(
      new Request(
        "https://billionco.vercel.app/kin-a2/telegram-session/complete?tg_s=abc&tg_a=access-proof&next=/kin-a2/account",
      ),
      { params: Promise.resolve({ tenantSlug: "kin-a2" }) },
    );

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toContain("text/html");
    expect(response.headers.get("cache-control")).toBe("no-store");
    expect(response.headers.get("referrer-policy")).toBe("no-referrer");
    expect(consumeTelegramSessionHandoff).toHaveBeenCalledWith({
      tenantId: "tenant-1",
      code: "abc",
    });
    expect(attachCustomerSessionCookie).toHaveBeenCalled();
    const html = await response.text();
    expect(html).toContain("location.replace");
    expect(html).toContain("/kin-a2/account");
    expect(html).toContain("tg_a=access-proof");
    expect(html).toContain("sessionStorage.setItem");
    expect(html).toContain('name="referrer" content="no-referrer"');
    expect(html).not.toContain("tg_s=");
  });

  it("still returns 200 HTML when handoff is invalid (no cookie set)", async () => {
    consumeTelegramSessionHandoff.mockResolvedValueOnce(null);

    const response = await GET(
      new Request(
        "https://billionco.vercel.app/kin-a2/telegram-session/complete?tg_s=bad&next=/kin-a2/account",
      ),
      { params: Promise.resolve({ tenantSlug: "kin-a2" }) },
    );

    expect(response.status).toBe(200);
    expect(attachCustomerSessionCookie).not.toHaveBeenCalled();
  });
});
