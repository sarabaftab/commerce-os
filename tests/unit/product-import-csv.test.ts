import { describe, expect, it } from "vitest";

import {
  PRODUCT_IMPORT_TEMPLATE_CSV,
  csvRowsToRecords,
  generateProductSlug,
  parseCsvActive,
  parseCsvPrice,
  parseImportRecords,
} from "@/modules/catalog/import/csv";
import { matchCategory, reserveImportSlug } from "@/modules/catalog/import/validate";
import { toMinor } from "@/shared/money/money";

const header =
  "name,slug,description,category,brand,volume,price,active";

describe("generateProductSlug", () => {
  it("kebab-cases a product name", () => {
    expect(generateProductSlug("KIN A2 Fresh Milk 1L")).toBe("kin-a2-fresh-milk-1l");
  });

  it("strips accents", () => {
    expect(generateProductSlug("Café Lait")).toBe("cafe-lait");
  });
});

describe("parseCsvPrice", () => {
  it("parses $30.00 as major units", () => {
    expect(parseCsvPrice("$30.00")).toBe(30);
    expect(toMinor(parseCsvPrice("$30.00"), "USD")).toBe(3000);
  });

  it("strips commas", () => {
    expect(parseCsvPrice("1,250.50")).toBe(1250.5);
  });

  it("rejects empty and negative prices", () => {
    expect(() => parseCsvPrice("")).toThrow(/required/i);
    expect(() => parseCsvPrice("-1")).toThrow(/zero or greater/i);
  });
});

describe("parseCsvActive", () => {
  it("accepts true/false, yes/no, 1/0, active/inactive", () => {
    expect(parseCsvActive("true")).toBe(true);
    expect(parseCsvActive("YES")).toBe(true);
    expect(parseCsvActive("1")).toBe(true);
    expect(parseCsvActive("active")).toBe(true);
    expect(parseCsvActive("false")).toBe(false);
    expect(parseCsvActive("no")).toBe(false);
    expect(parseCsvActive("0")).toBe(false);
    expect(parseCsvActive("inactive")).toBe(false);
  });

  it("rejects unknown values", () => {
    expect(() => parseCsvActive("maybe")).toThrow(/active/i);
  });
});

describe("csvRowsToRecords", () => {
  it("parses the bundled template", () => {
    const records = csvRowsToRecords(PRODUCT_IMPORT_TEMPLATE_CSV);
    expect(records).toHaveLength(2);
    expect(records[0]?.name).toBe("KIN A2 Fresh Milk 1L");
    expect(records[1]?.slug).toBe("");
  });

  it("keeps commas inside quoted descriptions", () => {
    const csv = `${header}\nMilk,milk-1,"Grass-fed, 1 litre",Fresh Milk,KIN,1L,3.50,true\n`;
    const records = csvRowsToRecords(csv);
    expect(records[0]?.description).toBe("Grass-fed, 1 litre");
  });

  it("rejects missing columns", () => {
    expect(() => csvRowsToRecords("name,price\nMilk,3.50\n")).toThrow(
      /missing columns/i,
    );
  });
});

describe("parseImportRecords", () => {
  it("generates a slug from the name when slug is blank", () => {
    const records = csvRowsToRecords(
      `${header}\nKIN A2 Fresh Milk 500ml,,A2 milk,fresh-milk,KIN A2,500ml,2.00,true\n`,
    );
    const [result] = parseImportRecords(records);
    expect(result?.ok).toBe(true);
    if (result?.ok) {
      expect(result.row.slug).toBe("kin-a2-fresh-milk-500ml");
    }
  });

  it("flags invalid kebab-case slugs", () => {
    const records = csvRowsToRecords(
      `${header}\nMilk,Not A Slug,desc,fresh-milk,KIN,1L,2.00,true\n`,
    );
    const [result] = parseImportRecords(records);
    expect(result?.ok).toBe(false);
    if (!result?.ok) {
      expect(result.errors.join(" ")).toMatch(/kebab-case/i);
    }
  });
});

describe("matchCategory", () => {
  const categories = [
    { id: "cat-1", name: "Fresh Milk", slug: "fresh-milk", isActive: true },
    { id: "cat-2", name: "Yogurt", slug: "yogurt", isActive: false },
    { id: "cat-3", name: "Cheese", slug: "soft-cheese", isActive: true },
    { id: "cat-4", name: "Cheese", slug: "aged-cheese", isActive: true },
  ];

  it("matches by name or slug, case-insensitively", () => {
    expect(matchCategory(categories, "Fresh Milk")).toEqual({ id: "cat-1" });
    expect(matchCategory(categories, "fresh-milk")).toEqual({ id: "cat-1" });
  });

  it("does not auto-create missing categories", () => {
    expect(matchCategory(categories, "Butter")).toEqual({
      error: 'Category "Butter" was not found',
    });
  });

  it("rejects inactive categories", () => {
    expect(matchCategory(categories, "yogurt")).toEqual({
      error: 'Category "yogurt" is inactive',
    });
  });

  it("rejects ambiguous names", () => {
    expect(matchCategory(categories, "Cheese")).toEqual({
      error: 'Category "Cheese" matches more than one category',
    });
  });
});

describe("reserveImportSlug", () => {
  it("rejects slugs already in the tenant, including when they appear twice in the CSV", () => {
    const taken = new Set(["existing-milk"]);
    const seen = new Set<string>();
    expect(reserveImportSlug("existing-milk", taken, seen)).toBe(
      "A product with this slug already exists",
    );
    expect(reserveImportSlug("new-milk", taken, seen)).toBeNull();
    expect(reserveImportSlug("new-milk", taken, seen)).toBe("Duplicate slug in this CSV");
  });
});
