import {
  bogoAvailableSets,
  isBogoPurchasable,
  resolveBogoLineQuantities,
} from "@/modules/promotions/buy-one-get-one";
import type { ActiveBuyOneGetOne } from "@/modules/promotions/discount";

export type ProductAvailabilityInput = {
  isAvailable: boolean;
  deletedAt?: Date | null;
  stockQuantity?: number | null;
};

/**
 * Purchasable for storefront / cart.
 * - Soft-deleted → never
 * - Admin isAvailable false → never
 * - Active 1+1 → need floor(stock/2) ≥ 1 (null stock → OOS for 1+1)
 * - Else if stockQuantity set → need ≥ 1
 * - Else legacy isAvailable only
 */
export function isProductPurchasable(
  product: ProductAvailabilityInput,
  bogo: ActiveBuyOneGetOne | { promotionName?: string } | null | undefined,
): boolean {
  if (product.deletedAt || !product.isAvailable) {
    return false;
  }
  if (bogo) {
    return isBogoPurchasable(product.stockQuantity);
  }
  if (product.stockQuantity != null) {
    return product.stockQuantity >= 1;
  }
  return true;
}

/** Max customer-selected (paid) quantity for a line. */
export function maxPurchasableQuantity(
  product: ProductAvailabilityInput,
  bogo: ActiveBuyOneGetOne | { promotionName?: string } | null | undefined,
  absoluteMax: number,
): number {
  if (!isProductPurchasable(product, bogo)) {
    return 0;
  }
  if (bogo) {
    return Math.min(absoluteMax, bogoAvailableSets(product.stockQuantity));
  }
  if (product.stockQuantity != null) {
    return Math.min(absoluteMax, product.stockQuantity);
  }
  return absoluteMax;
}

export type ResolvedLinePromotion = {
  paidQuantity: number;
  freeQuantity: number;
  fulfillmentQuantity: number;
  promotionIdSnapshot: string | null;
  promotionNameSnapshot: string | null;
  promotionTypeSnapshot: string | null;
  lineTotalMinor: number;
};

/** Authoritative paid/free/fulfillment + line total (always unitPrice × paid). */
export function resolveLinePromotionQuantities(input: {
  paidQuantity: number;
  unitPriceMinor: number;
  bogo: ActiveBuyOneGetOne | null | undefined;
}): ResolvedLinePromotion {
  const paidQuantity = input.paidQuantity;
  if (input.bogo) {
    const qty = resolveBogoLineQuantities(paidQuantity);
    return {
      paidQuantity: qty.paidQuantity,
      freeQuantity: qty.freeQuantity,
      fulfillmentQuantity: qty.fulfillmentQuantity,
      promotionIdSnapshot: input.bogo.promotionId,
      promotionNameSnapshot: input.bogo.promotionName,
      promotionTypeSnapshot: "buy_one_get_one",
      lineTotalMinor: input.unitPriceMinor * qty.paidQuantity,
    };
  }
  return {
    paidQuantity,
    freeQuantity: 0,
    fulfillmentQuantity: paidQuantity,
    promotionIdSnapshot: null,
    promotionNameSnapshot: null,
    promotionTypeSnapshot: null,
    lineTotalMinor: input.unitPriceMinor * paidQuantity,
  };
}
