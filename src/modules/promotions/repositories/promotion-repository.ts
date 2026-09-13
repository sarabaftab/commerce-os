import type { Prisma, Promotion } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

export async function listPromotionsForAdmin(tenantId: string): Promise<Promotion[]> {
  return prisma.promotion.findMany({
    where: { tenantId },
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });
}

export async function findPromotionById(
  tenantId: string,
  promotionId: string,
): Promise<Promotion | null> {
  return prisma.promotion.findFirst({
    where: { id: promotionId, tenantId },
  });
}

/** Active-flagged rows for a tenant (date/min checks happen in discount helpers). */
export async function listActivePromotionsForTenant(tenantId: string): Promise<Promotion[]> {
  return prisma.promotion.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function createPromotion(
  data: Prisma.PromotionUncheckedCreateInput,
): Promise<Promotion> {
  return prisma.promotion.create({ data });
}

export async function updatePromotion(
  promotionId: string,
  tenantId: string,
  data: Prisma.PromotionUncheckedUpdateInput,
): Promise<Promotion> {
  const result = await prisma.promotion.updateMany({
    where: { id: promotionId, tenantId },
    data,
  });
  if (result.count === 0) {
    throw new Error("Promotion not found for tenant");
  }
  return prisma.promotion.findFirstOrThrow({
    where: { id: promotionId, tenantId },
  });
}
