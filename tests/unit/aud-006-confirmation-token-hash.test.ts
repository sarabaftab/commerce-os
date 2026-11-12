import { describe, expect, it } from "vitest";

import {
  createOrderConfirmationToken,
  hashOrderConfirmationToken,
  readOrderConfirmationTokenFromRequest,
} from "@/shared/orders/confirmation-cookie";
import { ORDER_CONFIRMATION_COOKIE } from "@/shared/orders/confirmation-cookie";

/**
 * AUD-006: confirmation secrets are hashed at rest and not accepted from ?token=.
 */
describe("AUD-006 confirmation token hashing and cookie-only access", () => {
  it("hashes tokens to stable 64-char hex", () => {
    const token = createOrderConfirmationToken();
    const hash = hashOrderConfirmationToken(token);
    expect(hash).toMatch(/^[0-9a-f]{64}$/);
    expect(hash).toBe(hashOrderConfirmationToken(token));
    expect(hash).not.toBe(token);
  });

  it("reads the token from the confirmation cookie only", () => {
    const orderNumber = "KIN-A2-000042";
    const token = createOrderConfirmationToken();
    const cookie = `${ORDER_CONFIRMATION_COOKIE}=${encodeURIComponent(`${orderNumber}.${token}`)}`;
    const request = new Request(
      `https://shop.test/api/v1/kin-a2/orders/${orderNumber}?token=leaked-from-query`,
      { headers: { cookie } },
    );

    expect(readOrderConfirmationTokenFromRequest(request, orderNumber)).toBe(token);
  });

  it("ignores ?token= when no matching cookie is present", () => {
    const orderNumber = "KIN-A2-000042";
    const request = new Request(
      `https://shop.test/api/v1/kin-a2/orders/${orderNumber}?token=should-not-work`,
    );

    expect(readOrderConfirmationTokenFromRequest(request, orderNumber)).toBeNull();
  });

  it("ignores cookies for a different order number", () => {
    const token = createOrderConfirmationToken();
    const cookie = `${ORDER_CONFIRMATION_COOKIE}=${encodeURIComponent(`OTHER-1.${token}`)}`;
    const request = new Request("https://shop.test/api/v1/kin-a2/orders/KIN-A2-000042", {
      headers: { cookie },
    });

    expect(readOrderConfirmationTokenFromRequest(request, "KIN-A2-000042")).toBeNull();
  });
});
