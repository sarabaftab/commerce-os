/**
 * Pure buy_one_get_one (1+1) helpers.
 * Rule is fixed: buy 1 → receive 1 additional free of the SAME SKU.
 * paidQuantity = customer-selected sets; fulfillmentQuantity = paid × 2.
 */

export const BUY_ONE_GET_ONE = "buy_one_get_one" as const;

export type BuyOneGetOneType = typeof BUY_ONE_GET_ONE;

export function isBuyOneGetOneType(
  type: string | null | undefined,
): type is BuyOneGetOneType {
  return type === BUY_ONE_GET_ONE;
}

/** Free units gifted for a paid quantity (1+1 → equal free count). */
export function bogoFreeQuantity(paidQuantity: number): number {
  if (!Number.isInteger(paidQuantity) || paidQuantity <= 0) {
    return 0;
  }
  return paidQuantity;
}

/** Physical units to ship / deduct from stock. */
export function bogoFulfillmentQuantity(paidQuantity: number): number {
  if (!Number.isInteger(paidQuantity) || paidQuantity <= 0) {
    return 0;
  }
  return paidQuantity * 2;
}

/**
 * Complete promotional sets sellable from on-hand stock.
 * stock 0–1 → 0; stock 2–3 → 1; stock 4–5 → 2; …
 * Null stock = no countable inventory → 0 sets (cannot sell incomplete 1+1).
 */
export function bogoAvailableSets(stockQuantity: number | null | undefined): number {
  if (stockQuantity == null || !Number.isInteger(stockQuantity) || stockQuantity < 2) {
    return 0;
  }
  return Math.floor(stockQuantity / 2);
}

export function isBogoPurchasable(stockQuantity: number | null | undefined): boolean {
  return bogoAvailableSets(stockQuantity) >= 1;
}

export type BogoLineQuantities = {
  paidQuantity: number;
  freeQuantity: number;
  fulfillmentQuantity: number;
};

export function resolveBogoLineQuantities(paidQuantity: number): BogoLineQuantities {
  const freeQuantity = bogoFreeQuantity(paidQuantity);
  return {
    paidQuantity,
    freeQuantity,
    fulfillmentQuantity: paidQuantity + freeQuantity,
  };
}
