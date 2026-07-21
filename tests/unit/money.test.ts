import { describe, expect, it } from "vitest";

import {
  createMoney,
  formatMoney,
  fromMinor,
  getCurrencyExponent,
  toMinor,
} from "@/shared/money/money";

describe("money", () => {
  it("converts major units to minor units for USD", () => {
    expect(toMinor(12.5, "USD")).toBe(1250);
    expect(toMinor(0.01, "USD")).toBe(1);
  });

  it("converts minor units back to major units", () => {
    expect(fromMinor(1250, "USD")).toBe(12.5);
  });

  it("treats JPY as zero-decimal", () => {
    expect(getCurrencyExponent("JPY")).toBe(0);
    expect(toMinor(500, "JPY")).toBe(500);
    expect(fromMinor(500, "JPY")).toBe(500);
  });

  it("formats money for display", () => {
    expect(formatMoney(1250, "USD", "en-US")).toContain("12.50");
  });

  it("creates a typed money value", () => {
    expect(createMoney(100, "usd")).toEqual({ amountMinor: 100, currency: "USD" });
  });

  it("rejects non-integer minor amounts", () => {
    expect(() => fromMinor(12.5, "USD")).toThrow(/integer/);
  });
});
