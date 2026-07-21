import type { Category, Prisma } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

export async function listCategories(tenantId: string): Promise<Category[]> {
  return prisma.category.findMany({
    where: { tenantId, deletedAt: null },
    orderBy: [{ sortOrder: "asc" }, { name: "asc" }],
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

export async function findCategoryById(
  tenantId: string,
  categoryId: string,
): Promise<Category | null> {
  return prisma.category.findFirst({
    where: { id: categoryId, tenantId, deletedAt: null },
  });
}

export async function createCategory(data: Prisma.CategoryCreateInput): Promise<Category> {
  return prisma.category.create({ data });
}
