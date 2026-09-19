import { describe, expect, it } from "vitest";

import {
  productFormSchema,
  productFormToCreateInput,
} from "@/modules/catalog/schemas/product";

describe("product isFeatured", () => {
  it("defaults featured false and preserves available/sort order separately", () => {
    const parsed = productFormSchema.parse({
      name: "Milk",
      slug: "milk",
      priceMajor: 20,
      currency: "USD",
      isAvailable: true,
      isFeatured: false,
      stockQuantity: "",
      sortOrder: 2,
    });
    const input = productFormToCreateInput(parsed, "tenant-a");
    expect(input.isFeatured).toBe(false);
    expect(input.isAvailable).toBe(true);
    expect(input.sortOrder).toBe(2);
  });

  it("accepts featured true independently of availability", () => {
    const parsed = productFormSchema.parse({
      name: "Milk",
      slug: "milk",
      priceMajor: 20,
      currency: "USD",
      isAvailable: false,
      isFeatured: true,
      stockQuantity: "",
      sortOrder: 0,
    });
    const input = productFormToCreateInput(parsed, "tenant-a");
    expect(input.isFeatured).toBe(true);
    expect(input.isAvailable).toBe(false);
  });
});
