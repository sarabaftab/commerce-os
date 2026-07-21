import type { Prisma, Product } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

import type { ProductWithRelations } from "../types";

export async function listProducts(tenantId: string): Promise<ProductWithRelations[]> {
  return prisma.product.findMany({
    where: { tenantId, deletedAt: null },
    include: {
      category: true,
      media: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listAvailableProducts(
  tenantId: string,
  options?: { categoryId?: string; limit?: number },
): Promise<ProductWithRelations[]> {
  return prisma.product.findMany({
    where: {
      tenantId,
      deletedAt: null,
      isAvailable: true,
      ...(options?.categoryId ? { categoryId: options.categoryId } : {}),
    },
    include: {
      category: true,
      media: { orderBy: { sortOrder: "asc" } },
    },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    ...(options?.limit ? { take: options.limit } : {}),
  });
}

export async function findProductById(
  tenantId: string,
  productId: string,
): Promise<ProductWithRelations | null> {
  return prisma.product.findFirst({
    where: { id: productId, tenantId, deletedAt: null },
    include: {
      category: true,
      media: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function findProductBySlug(
  tenantId: string,
  slug: string,
): Promise<Product | null> {
  return prisma.product.findFirst({
    where: { tenantId, slug, deletedAt: null },
  });
}

export async function findAvailableProductBySlug(
  tenantId: string,
  slug: string,
): Promise<ProductWithRelations | null> {
  return prisma.product.findFirst({
    where: {
      tenantId,
      slug,
      deletedAt: null,
      isAvailable: true,
    },
    include: {
      category: true,
      media: { orderBy: { sortOrder: "asc" } },
    },
  });
}

export async function createProduct(
  data: Prisma.ProductUncheckedCreateInput,
): Promise<Product> {
  return prisma.product.create({ data });
}

export async function updateProduct(
  productId: string,
  tenantId: string,
  data: Prisma.ProductUncheckedUpdateInput,
): Promise<Product> {
  const result = await prisma.product.updateMany({
    where: { id: productId, tenantId, deletedAt: null },
    data,
  });

  if (result.count === 0) {
    throw new Error("Product not found for tenant");
  }

  return prisma.product.findFirstOrThrow({
    where: { id: productId, tenantId },
  });
}

export async function softDeleteProduct(tenantId: string, productId: string) {
  return prisma.product.updateMany({
    where: { id: productId, tenantId, deletedAt: null },
    data: { deletedAt: new Date(), isAvailable: false },
  });
}
