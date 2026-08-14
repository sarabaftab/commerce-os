import { AppError } from "@/shared/errors/app-error";

import { findCategoryById } from "../repositories/category-repository";
import { replacePrimaryMedia } from "../repositories/product-media-repository";
import {
  countProductsForTenant,
  createProduct,
  findProductById,
  findProductBySlug,
  listAdminProductSummaries,
  listProducts,
  softDeleteProduct,
  updateProduct,
} from "../repositories/product-repository";
import type { CreateProductInput, UpdateProductInput } from "../types";

export async function getProductsForTenant(tenantId: string) {
  return listProducts(tenantId);
}

export async function getAdminProductList(
  tenantId: string,
  options?: { page?: number; pageSize?: number },
) {
  const pageSize = Math.min(Math.max(options?.pageSize ?? 50, 1), 100);
  const page = Math.max(options?.page ?? 1, 1);
  const { items, total } = await listAdminProductSummaries(tenantId, {
    skip: (page - 1) * pageSize,
    take: pageSize,
  });
  return {
    items,
    total,
    page,
    pageSize,
    totalPages: Math.max(1, Math.ceil(total / pageSize)),
  };
}

export async function getProductCountsForTenant(tenantId: string) {
  return countProductsForTenant(tenantId);
}

export async function getProductForTenant(tenantId: string, productId: string) {
  const product = await findProductById(tenantId, productId);
  if (!product) {
    throw new AppError("NOT_FOUND", "Product not found");
  }
  return product;
}

async function assertCategoryBelongsToTenant(
  tenantId: string,
  categoryId: string | null | undefined,
) {
  if (!categoryId) {
    return;
  }

  const category = await findCategoryById(tenantId, categoryId);
  if (!category) {
    throw new AppError("VALIDATION", "Category not found for this tenant");
  }
}

export async function createProductForTenant(input: CreateProductInput) {
  await assertCategoryBelongsToTenant(input.tenantId, input.categoryId);

  const existing = await findProductBySlug(input.tenantId, input.slug);
  if (existing) {
    throw new AppError("CONFLICT", "A product with this slug already exists");
  }

  const product = await createProduct({
    tenantId: input.tenantId,
    name: input.name,
    slug: input.slug,
    description: input.description,
    priceMinor: input.priceMinor,
    currency: input.currency,
    categoryId: input.categoryId,
    isAvailable: input.isAvailable,
    stockNote: input.stockNote,
    sortOrder: input.sortOrder ?? 0,
  });

  if (input.mediaUrl) {
    await replacePrimaryMedia({
      tenantId: input.tenantId,
      productId: product.id,
      url: input.mediaUrl,
      alt: input.name,
    });
  }

  return getProductForTenant(input.tenantId, product.id);
}

export async function updateProductForTenant(input: UpdateProductInput) {
  const existing = await findProductById(input.tenantId, input.productId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Product not found");
  }

  await assertCategoryBelongsToTenant(input.tenantId, input.categoryId);

  const slugOwner = await findProductBySlug(input.tenantId, input.slug);
  if (slugOwner && slugOwner.id !== input.productId) {
    throw new AppError("CONFLICT", "A product with this slug already exists");
  }

  await updateProduct(input.productId, input.tenantId, {
    name: input.name,
    slug: input.slug,
    description: input.description,
    priceMinor: input.priceMinor,
    currency: input.currency,
    categoryId: input.categoryId,
    isAvailable: input.isAvailable,
    stockNote: input.stockNote,
    sortOrder: input.sortOrder ?? 0,
  });

  await replacePrimaryMedia({
    tenantId: input.tenantId,
    productId: input.productId,
    url: input.mediaUrl ?? null,
    alt: input.name,
  });

  return getProductForTenant(input.tenantId, input.productId);
}

export async function deleteProductForTenant(tenantId: string, productId: string) {
  const existing = await findProductById(tenantId, productId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Product not found");
  }

  await softDeleteProduct(tenantId, productId);
}
