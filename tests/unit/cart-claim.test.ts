import { describe, expect, it } from "vitest";

import { AppError } from "@/shared/errors/app-error";

/**
 * Mirrors convertCart claim guard used in checkout.
 */
function claimCart(count: number) {
  if (count !== 1) {
    throw new AppError("CONFLICT", "This cart was already checked out");
  }
}

describe("cart claim concurrency guard", () => {
  it("accepts a single successful claim", () => {
    expect(() => claimCart(1)).not.toThrow();
  });

  it("rejects a second claim", () => {
    expect(() => claimCart(0)).toThrow(/already checked out/i);
  });
});
