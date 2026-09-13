import { AppError } from "@/shared/errors/app-error";

import {
  catalogCategoriesTag,
  catalogTag,
} from "../cache-tags";
import {
  countProductsInCategory,
  createCategory,
  findCategoryById,
  findCategoryBySlugForTenant,
  listCategories,
  listCategoriesWithProductCounts,
  softDeleteCategory,
  updateCategory,
} from "../repositories/category-repository";

export type CreateCategoryInput = {
  tenantId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
};

export type UpdateCategoryInput = CreateCategoryInput & {
  categoryId: string;
};

/** Admin product form + legacy callers — active and inactive, not soft-deleted. */
export async function getCategoriesForTenant(tenantId: string) {
  return listCategories(tenantId);
}

export function categoryRevalidationTargets(tenantId: string, tenantSlug: string) {
  return {
    tags: [catalogTag(tenantId), catalogCategoriesTag(tenantId)] as const,
    paths: [`/${tenantSlug}`, `/${tenantSlug}/products`] as const,
  };
}

export async function getAdminCategories(tenantId: string) {
  return listCategoriesWithProductCounts(tenantId);
}

export async function getCategoryForTenant(tenantId: string, categoryId: string) {
  const category = await findCategoryById(tenantId, categoryId);
  if (!category) {
    throw new AppError("NOT_FOUND", "Category not found");
  }
  return category;
}

export async function createCategoryForTenant(input: CreateCategoryInput) {
  const existing = await findCategoryBySlugForTenant(input.tenantId, input.slug);
  if (existing) {
    throw new AppError("CONFLICT", "A category with this slug already exists");
  }

  return createCategory({
    tenantId: input.tenantId,
    name: input.name,
    slug: input.slug,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  });
}

export async function updateCategoryForTenant(input: UpdateCategoryInput) {
  await getCategoryForTenant(input.tenantId, input.categoryId);

  const slugOwner = await findCategoryBySlugForTenant(input.tenantId, input.slug);
  if (slugOwner && slugOwner.id !== input.categoryId) {
    throw new AppError("CONFLICT", "A category with this slug already exists");
  }

  return updateCategory(input.categoryId, input.tenantId, {
    name: input.name,
    slug: input.slug,
    sortOrder: input.sortOrder,
    isActive: input.isActive,
  });
}

export async function deleteCategoryForTenant(tenantId: string, categoryId: string) {
  await getCategoryForTenant(tenantId, categoryId);

  const productCount = await countProductsInCategory(tenantId, categoryId);
  if (productCount > 0) {
    throw new AppError(
      "CONFLICT",
      `Cannot delete: ${productCount} product${productCount === 1 ? "" : "s"} still use this category. Move or remove them first, or deactivate the category instead.`,
    );
  }

  const result = await softDeleteCategory(tenantId, categoryId);
  if (result.count === 0) {
    throw new AppError("NOT_FOUND", "Category not found");
  }
}
