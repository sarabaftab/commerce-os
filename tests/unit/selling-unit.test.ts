import { describe, expect, it } from "vitest";

import {
  coerceSellingUnit,
  formatPackSizeLine,
  formatPriceTimesQuantity,
  formatUnitPriceLabel,
} from "@/modules/catalog/selling-unit";

describe("selling-unit copy", () => {
  it("formats unit price with the product selling unit", () => {
    expect(formatUnitPriceLabel("$30.00", "case")).toBe("$30.00 / case");
    expect(formatUnitPriceLabel("$2.00", "item")).toBe("$2.00 / item");
  });

  it("omits pack size when volume is empty", () => {
    expect(formatPackSizeLine(null, "case")).toBeNull();
    expect(formatPackSizeLine("  ", "case")).toBeNull();
    expect(formatPackSizeLine("12 × 950ml", "case")).toBe("12 × 950ml per case");
  });

  it("pluralizes quantity copy", () => {
    expect(formatPriceTimesQuantity("$30.00", 1, "case")).toBe("$30.00 × 1 case");
    expect(formatPriceTimesQuantity("$30.00", 2, "case")).toBe("$30.00 × 2 cases");
  });

  it("treats missing snapshots as item", () => {
    expect(coerceSellingUnit(null)).toBe("item");
    expect(coerceSellingUnit("case")).toBe("case");
  });
});
