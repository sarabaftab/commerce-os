import { AppError } from "@/shared/errors/app-error";

import { isBuyOneGetOneType } from "../buy-one-get-one";
import {
  buildActiveBuyOneGetOneByProductId,
  buildStorefrontCampaignByProductId,
  isPromotionVisibleForBanner,
  pickEligibleCampaignDiscount,
  pickStorefrontCampaignDisplay,
  pickStorefrontCampaignForProduct,
  type ActiveBuyOneGetOne,
  type ResolvedCampaignDiscount,
  type StorefrontCampaignDisplay,
} from "../discount";
import {
  createPromotion,
  findPromotionById,
  listActivePromotionsForTenant,
  listPromotionsForAdmin,
  updatePromotion,
  type PromotionWithEligibleProducts,
} from "../repositories/promotion-repository";

export type CreatePromotionInput = {
  tenantId: string;
  name: string;
  bannerText?: string | null;
  type: "percentage" | "fixed" | "buy_one_get_one";
  value: number;
  minimumSubtotalMinor?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
  productIds?: string[];
};

export type UpdatePromotionInput = CreatePromotionInput & {
  promotionId: string;
};

export async function getAdminPromotions(tenantId: string) {
  return listPromotionsForAdmin(tenantId);
}

export async function getPromotionForTenant(tenantId: string, promotionId: string) {
  const promo = await findPromotionById(tenantId, promotionId);
  if (!promo) {
    throw new AppError("NOT_FOUND", "Promotion not found");
  }
  return promo;
}

async function assertEligibleProductsBelongToTenant(
  tenantId: string,
  productIds: string[],
) {
  if (productIds.length === 0) {
    return;
  }
  const { prisma } = await import("@/shared/db/prisma");
  const count = await prisma.product.count({
    where: {
      tenantId,
      id: { in: productIds },
      deletedAt: null,
    },
  });
  if (count !== productIds.length) {
    throw new AppError("VALIDATION", "One or more eligible products are invalid");
  }
}

export async function createPromotionForTenant(input: CreatePromotionInput) {
  const productIds = input.productIds ?? [];
  if (isBuyOneGetOneType(input.type) && productIds.length === 0) {
    throw new AppError("VALIDATION", "Select at least one eligible product for 1+1");
  }
  await assertEligibleProductsBelongToTenant(input.tenantId, productIds);

  return createPromotion({
    tenantId: input.tenantId,
    name: input.name,
    bannerText: input.bannerText ?? null,
    type: input.type,
    value: input.value,
    minimumSubtotalMinor: input.minimumSubtotalMinor ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    isActive: input.isActive,
    productIds,
  });
}

export async function updatePromotionForTenant(input: UpdatePromotionInput) {
  await getPromotionForTenant(input.tenantId, input.promotionId);
  const productIds = input.productIds ?? [];
  if (isBuyOneGetOneType(input.type) && productIds.length === 0) {
    throw new AppError("VALIDATION", "Select at least one eligible product for 1+1");
  }
  await assertEligibleProductsBelongToTenant(input.tenantId, productIds);

  return updatePromotion(input.promotionId, input.tenantId, {
    name: input.name,
    bannerText: input.bannerText ?? null,
    type: input.type,
    value: input.value,
    minimumSubtotalMinor: input.minimumSubtotalMinor ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    isActive: input.isActive,
    productIds,
  });
}

/**
 * Resolve money campaign discount(s) for a cart/order subtotal.
 * With line items, disjoint product-scoped campaigns can combine (newest wins per SKU).
 * buy_one_get_one is never selected here.
 */
export async function resolveCampaignDiscountForCheckout(input: {
  tenantId: string;
  subtotalMinor: number;
  lines?: { productId: string; lineTotalMinor: number }[];
  now?: Date;
}): Promise<ResolvedCampaignDiscount | null> {
  const promotions = await listActivePromotionsForTenant(input.tenantId);
  return pickEligibleCampaignDiscount(promotions, {
    subtotalMinor: input.subtotalMinor,
    lines: input.lines,
    now: input.now,
  });
}

/** Most recent visible banner among active date-window campaigns with banner text. */
export async function getStorefrontPromotionBanner(tenantId: string): Promise<{
  name: string;
  bannerText: string;
  type: string;
} | null> {
  const promotions = await listActivePromotionsForTenant(tenantId);
  const now = new Date();
  const visible = promotions
    .filter((promo) => isPromotionVisibleForBanner(promo, now))
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  const chosen = visible[0];
  if (!chosen?.bannerText?.trim()) {
    return null;
  }
  return {
    name: chosen.name,
    bannerText: chosen.bannerText.trim(),
    type: chosen.type,
  };
}

/**
 * Newest active-window money campaign overall (legacy / callers that only need one).
 * Prefer {@link getActiveStorefrontCampaignMap} so disjoint product sales all show.
 */
export async function getActiveStorefrontCampaign(
  tenantId: string,
  now?: Date,
): Promise<StorefrontCampaignDisplay | null> {
  const promotions = await listActivePromotionsForTenant(tenantId);
  return pickStorefrontCampaignDisplay(promotions, now ?? new Date());
}

/** Money campaign for one product (newest applicable active-window campaign). */
export async function getActiveStorefrontCampaignForProduct(
  tenantId: string,
  productId: string,
  now?: Date,
): Promise<StorefrontCampaignDisplay | null> {
  const promotions = await listActivePromotionsForTenant(tenantId);
  return pickStorefrontCampaignForProduct(
    promotions,
    productId,
    now ?? new Date(),
  );
}

/**
 * Money campaigns keyed by productId for storefront sale display.
 * Disjoint product-scoped percentage/fixed campaigns can all appear at once.
 */
export async function getActiveStorefrontCampaignMap(
  tenantId: string,
  productIds: readonly string[],
  now?: Date,
): Promise<Map<string, StorefrontCampaignDisplay>> {
  if (productIds.length === 0) {
    return new Map();
  }
  const promotions = await listActivePromotionsForTenant(tenantId);
  return buildStorefrontCampaignByProductId(
    promotions,
    productIds,
    now ?? new Date(),
  );
}

/** Active buy_one_get_one campaigns keyed by eligible productId. */
export async function getActiveBuyOneGetOneMap(
  tenantId: string,
  now?: Date,
): Promise<Map<string, ActiveBuyOneGetOne>> {
  const promotions = await listActivePromotionsForTenant(tenantId);
  return buildActiveBuyOneGetOneByProductId(promotions, now ?? new Date());
}

export type { PromotionWithEligibleProducts, ActiveBuyOneGetOne };
