import { AppError } from "@/shared/errors/app-error";

import {
  isPromotionVisibleForBanner,
  pickEligibleCampaignDiscount,
  type ResolvedCampaignDiscount,
} from "../discount";
import {
  createPromotion,
  findPromotionById,
  listActivePromotionsForTenant,
  listPromotionsForAdmin,
  updatePromotion,
} from "../repositories/promotion-repository";

export type CreatePromotionInput = {
  tenantId: string;
  name: string;
  bannerText?: string | null;
  type: "percentage" | "fixed";
  value: number;
  minimumSubtotalMinor?: number | null;
  startsAt?: Date | null;
  endsAt?: Date | null;
  isActive: boolean;
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

export async function createPromotionForTenant(input: CreatePromotionInput) {
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
  });
}

export async function updatePromotionForTenant(input: UpdatePromotionInput) {
  await getPromotionForTenant(input.tenantId, input.promotionId);
  return updatePromotion(input.promotionId, input.tenantId, {
    name: input.name,
    bannerText: input.bannerText ?? null,
    type: input.type,
    value: input.value,
    minimumSubtotalMinor: input.minimumSubtotalMinor ?? null,
    startsAt: input.startsAt ?? null,
    endsAt: input.endsAt ?? null,
    isActive: input.isActive,
  });
}

/**
 * Resolve the single campaign discount for a cart/order subtotal.
 * Deterministic: most recently created eligible active promotion wins.
 */
export async function resolveCampaignDiscountForCheckout(input: {
  tenantId: string;
  subtotalMinor: number;
  now?: Date;
}): Promise<ResolvedCampaignDiscount | null> {
  const promotions = await listActivePromotionsForTenant(input.tenantId);
  return pickEligibleCampaignDiscount(promotions, {
    subtotalMinor: input.subtotalMinor,
    now: input.now,
  });
}

/** Most recent visible banner among active date-window campaigns with banner text. */
export async function getStorefrontPromotionBanner(tenantId: string): Promise<{
  name: string;
  bannerText: string;
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
  return { name: chosen.name, bannerText: chosen.bannerText.trim() };
}
