import { describe, expect, it } from "vitest";

import {
  ADD_TO_CART_SUCCESS_HOLD_MS,
  addToCartButtonLabel,
  storefrontCatalogPath,
} from "@/modules/orders/add-to-cart-ui";

describe("add to cart UI helpers", () => {
  it("uses a short 600–1000ms success hold before navigation", () => {
    expect(ADD_TO_CART_SUCCESS_HOLD_MS).toBeGreaterThanOrEqual(600);
    expect(ADD_TO_CART_SUCCESS_HOLD_MS).toBeLessThanOrEqual(1000);
  });

  it("renders idle, loading, and success button labels", () => {
    expect(addToCartButtonLabel("idle")).toBe("Add to Cart");
    expect(addToCartButtonLabel("adding")).toBe("Adding…");
    expect(addToCartButtonLabel("added")).toBe("✓ Added to Cart");
    expect(addToCartButtonLabel("error")).toBe("Add to Cart");
  });

  it("builds the tenant catalog path without hardcoding a slug", () => {
    expect(storefrontCatalogPath("kin-a2")).toBe("/kin-a2/products");
    expect(storefrontCatalogPath("demo-shop")).toBe("/demo-shop/products");
  });
});
