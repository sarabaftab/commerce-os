import { unstable_cache } from "next/cache";

import { AppError } from "@/shared/errors/app-error";

import {
  CATALOG_REVALIDATE_SECONDS,
  catalogCategoriesTag,
  catalogProductTag,
  catalogTag,
} from "../cache-tags";
import { findCategoryBySlug, listActiveCategories } from "../repositories/category-repository";
import {
  findAvailableProductBySlug,
  listAvailableProducts,
} from "../repositories/product-repository";

export async function getStorefrontCategories(tenantId: string) {
  return unstable_cache(
    async () => listActiveCategories(tenantId),
    [`storefront-categories`, tenantId],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [catalogTag(tenantId), catalogCategoriesTag(tenantId)],
    },
  )();
}

export async function getStorefrontProducts(
  tenantId: string,
  options?: { categorySlug?: string },
) {
  const categorySlug = options?.categorySlug ?? "";

  if (!categorySlug) {
    return unstable_cache(
      async () => listAvailableProducts(tenantId),
      [`storefront-products`, tenantId, "all"],
      {
        revalidate: CATALOG_REVALIDATE_SECONDS,
        tags: [catalogTag(tenantId)],
      },
    )();
  }

  const category = await unstable_cache(
    async () => findCategoryBySlug(tenantId, categorySlug),
    [`storefront-category-row`, tenantId, categorySlug],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [catalogTag(tenantId), catalogCategoriesTag(tenantId)],
    },
  )();

  if (!category) {
    throw new AppError("NOT_FOUND", "Category not found");
  }

  return unstable_cache(
    async () => listAvailableProducts(tenantId, { categoryId: category.id }),
    [`storefront-products`, tenantId, categorySlug],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [catalogTag(tenantId)],
    },
  )();
}

export async function getFeaturedStorefrontProducts(tenantId: string, limit = 6) {
  return unstable_cache(
    async () => listAvailableProducts(tenantId, { limit }),
    [`storefront-featured`, tenantId, String(limit)],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [catalogTag(tenantId)],
    },
  )();
}

export async function getStorefrontProductBySlug(tenantId: string, slug: string) {
  const product = await unstable_cache(
    async () => findAvailableProductBySlug(tenantId, slug),
    [`storefront-product`, tenantId, slug],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [catalogTag(tenantId), catalogProductTag(tenantId, slug)],
    },
  )();

  if (!product) {
    throw new AppError("NOT_FOUND", "Product not found");
  }
  return product;
}

export async function getStorefrontCategoryBySlug(tenantId: string, slug: string) {
  const category = await unstable_cache(
    async () => findCategoryBySlug(tenantId, slug),
    [`storefront-category`, tenantId, slug],
    {
      revalidate: CATALOG_REVALIDATE_SECONDS,
      tags: [catalogTag(tenantId), catalogCategoriesTag(tenantId)],
    },
  )();

  if (!category) {
    throw new AppError("NOT_FOUND", "Category not found");
  }
  return category;
}
