import type { Category } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

export type CategoryWithProductCount = Category & {
  _count: { products: number };
};

export async function listCategories(tenantId: string): Promise<Category[]> {
  return prisma.category.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function listCategoriesWithProductCounts(
  tenantId: string,
): Promise<CategoryWithProductCount[]> {
  return prisma.category.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
    include: {
      _count: {
        select: {
          products: { where: { deletedAt: null } },
        },
      },
    },
  });
}

export async function listActiveCategories(tenantId: string): Promise<Category[]> {
  return prisma.category.findMany({
    where: { tenantId, deletedAt: null, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
  });
}

export async function findCategoryBySlug(
  tenantId: string,
  slug: string,
): Promise<Category | null> {
  return prisma.category.findFirst({
    where: { tenantId, slug, deletedAt: null, isActive: true },
  });
}

/** Admin uniqueness / ownership — includes inactive categories. */
export async function findCategoryBySlugForTenant(
  tenantId: string,
  slug: string,
): Promise<Category | null> {
  return prisma.category.findFirst({
    where: { tenantId, slug, deletedAt: null },
  });
}

export async function findCategoryById(
  tenantId: string,
  categoryId: string,
): Promise<Category | null> {
  return prisma.category.findFirst({
    where: { id: categoryId, tenantId, deletedAt: null },
  });
}

export async function countProductsInCategory(
  tenantId: string,
  categoryId: string,
): Promise<number> {
  return prisma.product.count({
    where: { tenantId, categoryId, deletedAt: null },
  });
}

export async function createCategory(data: {
  tenantId: string;
  name: string;
  slug: string;
  sortOrder: number;
  isActive: boolean;
}): Promise<Category> {
  return prisma.category.create({
    data: {
      tenantId: data.tenantId,
      name: data.name,
      slug: data.slug,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });
}

export async function updateCategory(
  categoryId: string,
  tenantId: string,
  data: {
    name: string;
    slug: string;
    sortOrder: number;
    isActive: boolean;
  },
): Promise<Category> {
  // Ownership already verified by service via findCategoryById(tenantId, categoryId).
  void tenantId;
  return prisma.category.update({
    where: { id: categoryId },
    data: {
      name: data.name,
      slug: data.slug,
      sortOrder: data.sortOrder,
      isActive: data.isActive,
    },
  });
}

export async function softDeleteCategory(
  tenantId: string,
  categoryId: string,
): Promise<{ count: number }> {
  const result = await prisma.category.updateMany({
    where: { id: categoryId, tenantId, deletedAt: null },
    data: { deletedAt: new Date(), isActive: false },
  });
  return { count: result.count };
}
