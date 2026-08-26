import { describe, expect, it, vi } from "vitest";

import { AppError } from "@/shared/errors/app-error";

const findCategoryById = vi.fn();
const findCategoryBySlugForTenant = vi.fn();
const countProductsInCategory = vi.fn();
const softDeleteCategory = vi.fn();
const createCategory = vi.fn();
const updateCategory = vi.fn();
const listCategories = vi.fn();
const listCategoriesWithProductCounts = vi.fn();

vi.mock("@/modules/catalog/repositories/category-repository", () => ({
  findCategoryById: (...args: unknown[]) => findCategoryById(...args),
  findCategoryBySlugForTenant: (...args: unknown[]) => findCategoryBySlugForTenant(...args),
  countProductsInCategory: (...args: unknown[]) => countProductsInCategory(...args),
  softDeleteCategory: (...args: unknown[]) => softDeleteCategory(...args),
  createCategory: (...args: unknown[]) => createCategory(...args),
  updateCategory: (...args: unknown[]) => updateCategory(...args),
  listCategories: (...args: unknown[]) => listCategories(...args),
  listCategoriesWithProductCounts: (...args: unknown[]) =>
    listCategoriesWithProductCounts(...args),
}));

const {
  createCategoryForTenant,
  deleteCategoryForTenant,
  updateCategoryForTenant,
} = await import("@/modules/catalog/services/category-service");

describe("category-admin-service", () => {
  it("rejects duplicate slug on create within the same tenant", async () => {
    findCategoryBySlugForTenant.mockResolvedValue({ id: "existing" });
    await expect(
      createCategoryForTenant({
        tenantId: "t1",
        name: "Dairy",
        slug: "dairy",
        sortOrder: 0,
        isActive: true,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
    expect(createCategory).not.toHaveBeenCalled();
  });

  it("allows create when slug is free", async () => {
    findCategoryBySlugForTenant.mockResolvedValue(null);
    createCategory.mockResolvedValue({ id: "c1" });
    await createCategoryForTenant({
      tenantId: "t1",
      name: "Dairy",
      slug: "dairy",
      sortOrder: 1,
      isActive: true,
    });
    expect(createCategory).toHaveBeenCalledWith({
      tenantId: "t1",
      name: "Dairy",
      slug: "dairy",
      sortOrder: 1,
      isActive: true,
    });
  });

  it("rejects update when slug belongs to another category in tenant", async () => {
    findCategoryById.mockResolvedValue({ id: "c1", tenantId: "t1" });
    findCategoryBySlugForTenant.mockResolvedValue({ id: "c2" });
    await expect(
      updateCategoryForTenant({
        tenantId: "t1",
        categoryId: "c1",
        name: "Dairy",
        slug: "dairy",
        sortOrder: 0,
        isActive: true,
      }),
    ).rejects.toMatchObject({ code: "CONFLICT" });
  });

  it("blocks delete when category still has products", async () => {
    findCategoryById.mockResolvedValue({ id: "c1", tenantId: "t1" });
    countProductsInCategory.mockResolvedValue(2);
    await expect(deleteCategoryForTenant("t1", "c1")).rejects.toBeInstanceOf(AppError);
    await expect(deleteCategoryForTenant("t1", "c1")).rejects.toMatchObject({
      code: "CONFLICT",
    });
    expect(softDeleteCategory).not.toHaveBeenCalled();
  });

  it("soft-deletes empty categories", async () => {
    findCategoryById.mockResolvedValue({ id: "c1", tenantId: "t1" });
    countProductsInCategory.mockResolvedValue(0);
    softDeleteCategory.mockResolvedValue({ count: 1 });
    await deleteCategoryForTenant("t1", "c1");
    expect(softDeleteCategory).toHaveBeenCalledWith("t1", "c1");
  });

  it("rejects cross-tenant category access", async () => {
    findCategoryById.mockResolvedValue(null);
    await expect(
      updateCategoryForTenant({
        tenantId: "other-tenant",
        categoryId: "c1",
        name: "X",
        slug: "x",
        sortOrder: 0,
        isActive: true,
      }),
    ).rejects.toMatchObject({ code: "NOT_FOUND" });
  });
});
