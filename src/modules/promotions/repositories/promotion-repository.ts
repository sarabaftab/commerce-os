import type { Prisma, Promotion } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

export type PromotionWithEligibleProducts = Promotion & {
  products: { productId: string }[];
};

const promotionProductsInclude = {
  products: { select: { productId: true } },
} as const;

export async function listPromotionsForAdmin(
  tenantId: string,
): Promise<PromotionWithEligibleProducts[]> {
  return prisma.promotion.findMany({
    where: { tenantId },
    include: promotionProductsInclude,
    orderBy: [{ createdAt: "desc" }, { name: "asc" }],
  });
}

export async function findPromotionById(
  tenantId: string,
  promotionId: string,
): Promise<PromotionWithEligibleProducts | null> {
  return prisma.promotion.findFirst({
    where: { id: promotionId, tenantId },
    include: promotionProductsInclude,
  });
}

/** Active-flagged rows for a tenant (date/min checks happen in discount helpers). */
export async function listActivePromotionsForTenant(
  tenantId: string,
): Promise<PromotionWithEligibleProducts[]> {
  return prisma.promotion.findMany({
    where: { tenantId, isActive: true },
    include: promotionProductsInclude,
    orderBy: [{ createdAt: "desc" }],
  });
}

export async function createPromotion(input: {
  tenantId: string;
  name: string;
  bannerText: string | null;
  type: Prisma.PromotionUncheckedCreateInput["type"];
  value: number;
  minimumSubtotalMinor: number | null;
  startsAt: Date | null;
  endsAt: Date | null;
  isActive: boolean;
  productIds: string[];
}): Promise<PromotionWithEligibleProducts> {
  return prisma.promotion.create({
    data: {
      tenantId: input.tenantId,
      name: input.name,
      bannerText: input.bannerText,
      type: input.type,
      value: input.value,
      minimumSubtotalMinor: input.minimumSubtotalMinor,
      startsAt: input.startsAt,
      endsAt: input.endsAt,
      isActive: input.isActive,
      products:
        input.productIds.length > 0
          ? {
              create: input.productIds.map((productId) => ({
                tenantId: input.tenantId,
                productId,
              })),
            }
          : undefined,
    },
    include: promotionProductsInclude,
  });
}

export async function updatePromotion(
  promotionId: string,
  tenantId: string,
  input: {
    name: string;
    bannerText: string | null;
    type: Prisma.PromotionUncheckedUpdateInput["type"];
    value: number;
    minimumSubtotalMinor: number | null;
    startsAt: Date | null;
    endsAt: Date | null;
    isActive: boolean;
    productIds: string[];
  },
): Promise<PromotionWithEligibleProducts> {
  await prisma.$transaction(async (tx) => {
    const result = await tx.promotion.updateMany({
      where: { id: promotionId, tenantId },
      data: {
        name: input.name,
        bannerText: input.bannerText,
        type: input.type,
        value: input.value,
        minimumSubtotalMinor: input.minimumSubtotalMinor,
        startsAt: input.startsAt,
        endsAt: input.endsAt,
        isActive: input.isActive,
      },
    });
    if (result.count === 0) {
      throw new Error("Promotion not found for tenant");
    }
    await tx.promotionProduct.deleteMany({ where: { promotionId, tenantId } });
    if (input.productIds.length > 0) {
      await tx.promotionProduct.createMany({
        data: input.productIds.map((productId) => ({
          tenantId,
          promotionId,
          productId,
        })),
      });
    }
  });
  return prisma.promotion.findFirstOrThrow({
    where: { id: promotionId, tenantId },
    include: promotionProductsInclude,
  });
}

/**
 * Atomically deduct on-hand stock. Returns false if insufficient (race-safe).
 */
export async function deductProductStockInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    productId: string;
    quantity: number;
  },
): Promise<boolean> {
  if (!Number.isInteger(input.quantity) || input.quantity <= 0) {
    return true;
  }
  const result = await tx.$executeRaw`
    UPDATE products
    SET stock_quantity = stock_quantity - ${input.quantity},
        updated_at = NOW()
    WHERE id = ${input.productId}
      AND tenant_id = ${input.tenantId}
      AND stock_quantity IS NOT NULL
      AND stock_quantity >= ${input.quantity}
  `;
  return result === 1;
}
