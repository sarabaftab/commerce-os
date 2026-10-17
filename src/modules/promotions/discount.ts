import type { Promotion, PromotionDiscountType } from "@prisma/client";

import {
  BUY_ONE_GET_ONE,
  isBuyOneGetOneType,
} from "./buy-one-get-one";

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
  /** Empty means the discount applies to the whole cart (legacy money promotions). */
  productIds: string[];
};

export type DiscountLine = {
  productId: string;
  lineTotalMinor: number;
};

type PromotionProductLink = { productId: string };

export function linkedPromotionProductIds(
  promo: { products?: PromotionProductLink[] | null },
): string[] {
  return promo.products?.map((row) => row.productId) ?? [];
}

/**
 * Merchandise base for a money discount.
 * No linked products → whole cart (existing percentage/fixed campaigns).
 * Linked products → only those lines.
 */
export function eligibleMerchandiseSubtotalMinor(
  lines: readonly DiscountLine[],
  productIds: readonly string[],
): number {
  if (productIds.length === 0) {
    return lines.reduce((sum, line) => sum + Math.max(0, line.lineTotalMinor), 0);
  }
  const allowed = new Set(productIds);
  return lines.reduce((sum, line) => {
    if (!allowed.has(line.productId)) {
      return sum;
    }
    return sum + Math.max(0, line.lineTotalMinor);
  }, 0);
}

/** Empty productIds applies to every product. */
export function campaignAppliesToProduct(
  productIds: readonly string[] | null | undefined,
  productId: string,
): boolean {
  if (!productIds || productIds.length === 0) {
    return true;
  }
  return productIds.includes(productId);
}

export function isMoneyDiscountType(
  type: PromotionDiscountType | string,
): type is "percentage" | "fixed" {
  return type === "percentage" || type === "fixed";
}

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
  // buy_one_get_one is product-scoped — never a cart-level money discount.
  if (isBuyOneGetOneType(promo.type)) {
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
 * buy_one_get_one never contributes a money discount (free units instead).
 */
export function computeCampaignDiscountMinor(
  subtotalMinor: number,
  promo: Pick<PromotionDiscountInput, "type" | "value">,
): number {
  if (isBuyOneGetOneType(promo.type)) {
    return 0;
  }
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
 * Among eligible money promotions, apply exactly one: most recently created.
 * buy_one_get_one is excluded (resolved per product).
 */
export function pickEligibleCampaignDiscount(
  promotions: Array<Promotion & { products?: PromotionProductLink[] }>,
  input: { subtotalMinor: number; lines?: readonly DiscountLine[]; now?: Date },
): ResolvedCampaignDiscount | null {
  const eligible = promotions
    .filter((promo) => isMoneyDiscountType(promo.type))
    .filter((promo) => isPromotionEligible(promo, input))
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  for (const chosen of eligible) {
    const productIds = linkedPromotionProductIds(chosen);
    const baseMinor =
      input.lines == null
        ? input.subtotalMinor
        : eligibleMerchandiseSubtotalMinor(input.lines, productIds);
    // A product-scoped campaign with none of those products in the cart does not
    // block an older whole-cart campaign.
    if (input.lines != null && productIds.length > 0 && baseMinor <= 0) {
      continue;
    }

    const discountMinor = computeCampaignDiscountMinor(baseMinor, chosen);
    if (discountMinor <= 0) {
      continue;
    }

    return {
      promotionId: chosen.id,
      promotionName: chosen.name,
      bannerText: chosen.bannerText,
      type: chosen.type,
      value: chosen.value,
      discountMinor,
      productIds,
    };
  }

  return null;
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
 * Fixed / buy_one_get_one do not map to honest per-product sale prices → null.
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
  /** Empty means every product (legacy money promotions with no eligible products). */
  productIds: string[];
};

/** Newest active-window money campaign for storefront sale-price display. */
export function pickStorefrontCampaignDisplay(
  promotions: Array<Promotion & { products?: PromotionProductLink[] }>,
  now: Date = new Date(),
): StorefrontCampaignDisplay | null {
  const chosen = promotions
    .filter((promo) => isMoneyDiscountType(promo.type))
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
    productIds: linkedPromotionProductIds(chosen),
  };
}

export type PromotionWithProducts = Promotion & {
  products: { productId: string }[];
};

export type ActiveBuyOneGetOne = {
  promotionId: string;
  promotionName: string;
  bannerText: string | null;
};

/**
 * Map productId → active buy_one_get_one campaign (newest wins per SKU).
 * Same-SKU only: eligibility is per product row on the promotion.
 */
export function buildActiveBuyOneGetOneByProductId(
  promotions: PromotionWithProducts[],
  now: Date = new Date(),
): Map<string, ActiveBuyOneGetOne> {
  const map = new Map<string, ActiveBuyOneGetOne>();
  const sorted = promotions
    .filter((promo) => isBuyOneGetOneType(promo.type))
    .filter((promo) => isPromotionInActiveWindow(promo, now))
    .slice()
    .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

  for (const promo of sorted) {
    const entry: ActiveBuyOneGetOne = {
      promotionId: promo.id,
      promotionName: promo.name,
      bannerText: promo.bannerText,
    };
    for (const row of promo.products) {
      if (!map.has(row.productId)) {
        map.set(row.productId, entry);
      }
    }
  }
  return map;
}

export { BUY_ONE_GET_ONE, isBuyOneGetOneType };
