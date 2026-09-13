import type { Promotion, PromotionDiscountType } from "@prisma/client";

export type PromotionDiscountInput = {
  type: PromotionDiscountType;
  value: number;
  minimumSubtotalMinor?: number | null;
  isActive: boolean;
  startsAt?: Date | null;
  endsAt?: Date | null;
  createdAt?: Date;
  id?: string;
  name?: string;
  bannerText?: string | null;
};

export type ResolvedCampaignDiscount = {
  promotionId: string;
  promotionName: string;
  bannerText: string | null;
  type: PromotionDiscountType;
  value: number;
  discountMinor: number;
};

/** Pure eligibility for date/active/minimum — no tenant check (caller scopes query). */
export function isPromotionEligible(
  promo: PromotionDiscountInput,
  input: { subtotalMinor: number; now?: Date },
): boolean {
  if (!promo.isActive) {
    return false;
  }
  const now = input.now ?? new Date();
  if (promo.startsAt && now < promo.startsAt) {
    return false;
  }
  if (promo.endsAt && now > promo.endsAt) {
    return false;
  }
  if (
    promo.minimumSubtotalMinor != null &&
    input.subtotalMinor < promo.minimumSubtotalMinor
  ) {
    return false;
  }
  return true;
}

/**
 * Discount in minor units. Clamped to [0, subtotal].
 * Percentage uses integer math: floor(subtotal * pct / 100).
 */
export function computeCampaignDiscountMinor(
  subtotalMinor: number,
  promo: Pick<PromotionDiscountInput, "type" | "value">,
): number {
  if (!Number.isInteger(subtotalMinor) || subtotalMinor <= 0) {
    return 0;
  }
  if (!Number.isInteger(promo.value) || promo.value <= 0) {
    return 0;
  }

  let raw = 0;
  if (promo.type === "percentage") {
    if (promo.value > 100) {
      return 0;
    }
    raw = Math.floor((subtotalMinor * promo.value) / 100);
  } else {
    raw = promo.value;
  }

  return Math.max(0, Math.min(raw, subtotalMinor));
}

/**
 * Among eligible promotions, apply exactly one: most recently created.
 */
export function pickEligibleCampaignDiscount(
  promotions: Promotion[],
  input: { subtotalMinor: number; now?: Date },
): ResolvedCampaignDiscount | null {
  const eligible = promotions
    .filter((promo) => isPromotionEligible(promo, input))
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  const chosen = eligible[0];
  if (!chosen) {
    return null;
  }

  const discountMinor = computeCampaignDiscountMinor(input.subtotalMinor, chosen);
  if (discountMinor <= 0) {
    return null;
  }

  return {
    promotionId: chosen.id,
    promotionName: chosen.name,
    bannerText: chosen.bannerText,
    type: chosen.type,
    value: chosen.value,
    discountMinor,
  };
}

/** Active + in date window (ignores minimum subtotal — browsing/banner display). */
export function isPromotionInActiveWindow(
  promo: Pick<PromotionDiscountInput, "isActive" | "startsAt" | "endsAt">,
  now: Date = new Date(),
): boolean {
  if (!promo.isActive) {
    return false;
  }
  if (promo.startsAt && now < promo.startsAt) {
    return false;
  }
  if (promo.endsAt && now > promo.endsAt) {
    return false;
  }
  return true;
}

/** Banner visibility: active + in date window + non-empty banner text. */
export function isPromotionVisibleForBanner(
  promo: Pick<PromotionDiscountInput, "isActive" | "startsAt" | "endsAt" | "bannerText">,
  now: Date = new Date(),
): boolean {
  const text = promo.bannerText?.trim();
  if (!text) {
    return false;
  }
  return isPromotionInActiveWindow(promo, now);
}

/**
 * Display-only unit sale price for percentage campaigns.
 * Fixed cart-level discounts do not map to honest per-product prices → null.
 * Catalog/checkout still charge full unit prices; order discount is applied at totals.
 */
export function computeUnitSalePriceMinor(
  priceMinor: number,
  promo: Pick<PromotionDiscountInput, "type" | "value">,
): number | null {
  if (promo.type !== "percentage") {
    return null;
  }
  const discount = computeCampaignDiscountMinor(priceMinor, promo);
  if (discount <= 0) {
    return null;
  }
  return priceMinor - discount;
}

export type StorefrontCampaignDisplay = {
  id: string;
  name: string;
  type: PromotionDiscountType;
  value: number;
};

/** Newest active-window campaign for storefront sale-price display. */
export function pickStorefrontCampaignDisplay(
  promotions: Promotion[],
  now: Date = new Date(),
): StorefrontCampaignDisplay | null {
  const chosen = promotions
    .filter((promo) => isPromotionInActiveWindow(promo, now))
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0];
  if (!chosen) {
    return null;
  }
  return {
    id: chosen.id,
    name: chosen.name,
    type: chosen.type,
    value: chosen.value,
  };
}
