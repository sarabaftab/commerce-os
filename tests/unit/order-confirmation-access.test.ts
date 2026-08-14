import { describe, expect, it } from "vitest";

import {
  buildOrderConfirmationCookieValue,
  confirmationTokensMatch,
  createOrderConfirmationToken,
  parseOrderConfirmationCookieValue,
} from "@/shared/orders/confirmation-cookie";

describe("order confirmation tokens", () => {
  it("creates high-entropy tokens", () => {
    const a = createOrderConfirmationToken();
    const b = createOrderConfirmationToken();
    expect(a).not.toBe(b);
    expect(a.length).toBeGreaterThanOrEqual(32);
  });

  it("round-trips cookie value", () => {
    const token = createOrderConfirmationToken();
    const raw = buildOrderConfirmationCookieValue("KIN-A2-000001", token);
    expect(parseOrderConfirmationCookieValue(raw)).toEqual({
      orderNumber: "KIN-A2-000001",
      token,
    });
  });

  it("rejects malformed cookie values", () => {
    expect(parseOrderConfirmationCookieValue("nope")).toBeNull();
    expect(parseOrderConfirmationCookieValue(".token")).toBeNull();
    expect(parseOrderConfirmationCookieValue("order.")).toBeNull();
  });

  it("compares tokens in constant-time wrapper", () => {
    const token = createOrderConfirmationToken();
    expect(confirmationTokensMatch(token, token)).toBe(true);
    expect(confirmationTokensMatch(token, createOrderConfirmationToken())).toBe(false);
  });
});
