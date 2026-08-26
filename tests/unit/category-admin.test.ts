import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  categoryFormDataToObject,
  categoryFormSchema,
  categoryFormToCreateInput,
  categoryFormToUpdateInput,
  slugifyCategoryName,
} from "@/modules/catalog/schemas/category";
import { categoryRevalidationTargets } from "@/modules/catalog/services/category-service";
import { FieldLabel } from "@/ui/components/field-label";
import { Label } from "@/ui/components/ui/label";

describe("slugifyCategoryName", () => {
  it("builds lowercase kebab-case slugs", () => {
    expect(slugifyCategoryName(" Fresh Milk ")).toBe("fresh-milk");
    expect(slugifyCategoryName("A & B!!")).toBe("a-b");
  });
});

describe("categoryFormSchema", () => {
  it("accepts a valid category", () => {
    const parsed = categoryFormSchema.safeParse({
      name: "Dairy",
      slug: "dairy",
      sortOrder: "3",
      isActive: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sortOrder).toBe(3);
      expect(parsed.data.isActive).toBe(true);
    }
  });

  it("requires name and slug", () => {
    const parsed = categoryFormSchema.safeParse({
      name: "  ",
      slug: "",
      sortOrder: "0",
      isActive: true,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects invalid slug format", () => {
    const parsed = categoryFormSchema.safeParse({
      name: "Dairy",
      slug: "Dairy Milk",
      sortOrder: 0,
      isActive: true,
    });
    expect(parsed.success).toBe(false);
  });
});

describe("categoryFormDataToObject", () => {
  it("auto-fills slug from name when blank", () => {
    const form = new FormData();
    form.set("name", "Cold Drinks");
    form.set("slug", "");
    form.set("sortOrder", "1");
    form.set("isActive", "true");
    const data = categoryFormDataToObject(form);
    expect(data.slug).toBe("cold-drinks");
  });
});

describe("categoryFormToCreateInput / updateInput", () => {
  it("scopes tenant from session, not the client", () => {
    const values = categoryFormSchema.parse({
      name: "Snacks",
      slug: "snacks",
      sortOrder: 2,
      isActive: false,
    });
    const create = categoryFormToCreateInput(values, "tenant-a");
    expect(create.tenantId).toBe("tenant-a");
    expect(create).not.toHaveProperty("categoryId");

    const update = categoryFormToUpdateInput(values, "tenant-a", "cat-1");
    expect(update.tenantId).toBe("tenant-a");
    expect(update.categoryId).toBe("cat-1");
  });
});

describe("categoryRevalidationTargets", () => {
  it("returns tenant-scoped catalog tags and storefront paths", () => {
    const targets = categoryRevalidationTargets("tenant-1", "kin-a2");
    expect(targets.tags).toContain("catalog:tenant-1");
    expect(targets.tags).toContain("catalog:tenant-1:categories");
    expect(targets.paths).toEqual(["/kin-a2", "/kin-a2/products"]);
  });
});

describe("required field labels", () => {
  it("renders a red asterisk and sr-only required text when required", () => {
    const html = renderToStaticMarkup(
      createElement(FieldLabel, { htmlFor: "phone", required: true, children: "Phone" }),
    );
    expect(html).toContain("Phone");
    expect(html).toContain("*");
    expect(html).toContain("text-red-600");
    expect(html).toContain("(required)");
  });

  it("omits asterisk for optional FieldLabel", () => {
    const html = renderToStaticMarkup(
      createElement(FieldLabel, { htmlFor: "email", children: "Email" }),
    );
    expect(html).toContain("Email");
    expect(html).not.toContain("*");
    expect(html).not.toContain("(required)");
  });

  it("admin Label required prop marks required fields", () => {
    const html = renderToStaticMarkup(
      createElement(Label, { htmlFor: "name", required: true, children: "Name" }),
    );
    expect(html).toContain("*");
    expect(html).toContain("text-destructive");
    expect(html).toContain("(required)");
  });
});
