import { beforeEach, describe, expect, it, vi } from "vitest";

const { findFirst } = vi.hoisted(() => ({
  findFirst: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: {
    cart: { findFirst },
  },
}));

import {
  assertCheckoutIdempotencyReplayAllowed,
  isCustomerBoundIdempotencyReplay,
  isGuestCartBoundIdempotencyReplay,
} from "@/modules/orders/services/checkout-idempotency";

/**
 * AUD-007: Idempotency key replay must be bound to the original caller.
 */
describe("AUD-007 checkout idempotency binding", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("allows replay for the same authenticated customer", () => {
    expect(
      isCustomerBoundIdempotencyReplay(
        { tenantId: "t1", customerId: "cust-1" },
        "cust-1",
      ),
    ).toBe(true);
  });

  it("rejects replay for a different authenticated customer", () => {
    expect(
      isCustomerBoundIdempotencyReplay(
        { tenantId: "t1", customerId: "cust-attacker" },
        "cust-1",
      ),
    ).toBe(false);
  });

  it("allows guest replay only when converted cart keeps the same guest token", () => {
    expect(
      isGuestCartBoundIdempotencyReplay({
        guestToken: "guest-abc",
        orderCustomerId: "cust-1",
        convertedCart: {
          status: "converted",
          customerId: "cust-1",
          guestToken: "guest-abc",
        },
      }),
    ).toBe(true);

    expect(
      isGuestCartBoundIdempotencyReplay({
        guestToken: "other-browser",
        orderCustomerId: "cust-1",
        convertedCart: {
          status: "converted",
          customerId: "cust-1",
          guestToken: "guest-abc",
        },
      }),
    ).toBe(false);

    expect(
      isGuestCartBoundIdempotencyReplay({
        guestToken: "guest-abc",
        orderCustomerId: "cust-1",
        convertedCart: null,
      }),
    ).toBe(false);
  });

  it("throws NOT_FOUND when another guest cookie tries to replay the key", async () => {
    findFirst.mockResolvedValue(null);

    await expect(
      assertCheckoutIdempotencyReplayAllowed(
        {
          tenantId: "t1",
          guestToken: "attacker-cookie",
        },
        { customerId: "cust-1" },
      ),
    ).rejects.toMatchObject({
      code: "NOT_FOUND",
      message: "Order not found",
    });

    expect(findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: expect.objectContaining({
          tenantId: "t1",
          guestToken: "attacker-cookie",
          customerId: "cust-1",
          status: "converted",
        }),
      }),
    );
  });

  it("allows guest replay when the converted cart matches", async () => {
    findFirst.mockResolvedValue({
      status: "converted",
      customerId: "cust-1",
      guestToken: "guest-abc",
    });

    await expect(
      assertCheckoutIdempotencyReplayAllowed(
        {
          tenantId: "t1",
          guestToken: "guest-abc",
        },
        { customerId: "cust-1" },
      ),
    ).resolves.toBeUndefined();
  });
});
