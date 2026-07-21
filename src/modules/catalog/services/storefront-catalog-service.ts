import { AppError } from "@/shared/errors/app-error";

import { findCategoryBySlug, listActiveCategories } from "../repositories/category-repository";
import {
  findAvailableProductBySlug,
  listAvailableProducts,
} from "../repositories/product-repository";

export async function getStorefrontCategories(tenantId: string) {
  return listActiveCategories(tenantId);
}

export async function getStorefrontProducts(
  tenantId: string,
  options?: { categorySlug?: string },
) {
  if (!options?.categorySlug) {
    return listAvailableProducts(tenantId);
  }

  const category = await findCategoryBySlug(tenantId, options.categorySlug);
  if (!category) {
    throw new AppError("NOT_FOUND", "Category not found");
  }

  return listAvailableProducts(tenantId, { categoryId: category.id });
}

export async function getFeaturedStorefrontProducts(tenantId: string, limit = 6) {
  return listAvailableProducts(tenantId, { limit });
}

export async function getStorefrontProductBySlug(tenantId: string, slug: string) {
  const product = await findAvailableProductBySlug(tenantId, slug);
  if (!product) {
    throw new AppError("NOT_FOUND", "Product not found");
  }
  return product;
}

export async function getStorefrontCategoryBySlug(tenantId: string, slug: string) {
  const category = await findCategoryBySlug(tenantId, slug);
  if (!category) {
    throw new AppError("NOT_FOUND", "Category not found");
  }
  return category;
}
