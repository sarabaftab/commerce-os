import { parseLocale } from "@/shared/i18n/locale";
import { t } from "@/shared/i18n/messages";
import { toMinor } from "@/shared/money/money";
import { AppError } from "@/shared/errors/app-error";

/** COD is available only for merchandise subtotals strictly below this major amount (USD $30). */
export const COD_MAX_MERCHANDISE_MAJOR = 30;

/**
 * Merchandise amount used for COD eligibility:
 * line/campaign pricing after promotions, before delivery fees.
 */
export function merchandiseSubtotalAfterDiscountMinor(
  subtotalMinor: number,
  discountMinor: number,
): number {
  return Math.max(0, subtotalMinor - Math.max(0, discountMinor));
}

/**
 * COD eligible when merchandise subtotal (after discounts, before delivery) is strictly below $30.00.
 * Uses integer minor units — never floating-point dollar comparisons.
 */
export function isCashOnDeliveryEligible(
  merchandiseSubtotalMinor: number,
  currency: string,
): boolean {
  const maxMinor = toMinor(COD_MAX_MERCHANDISE_MAJOR, currency);
  return merchandiseSubtotalMinor < maxMinor;
}

/**
 * Reject COD when the authoritative merchandise subtotal is at or above the limit.
 * Call only with server-recalculated amounts — never trust a browser-supplied subtotal.
 */
export function assertCashOnDeliveryAllowed(input: {
  paymentMethod: "cod" | "aba_transfer";
  merchandiseSubtotalMinor: number;
  currency: string;
  locale?: string | null;
}): void {
  if (input.paymentMethod !== "cod") {
    return;
  }
  if (
    isCashOnDeliveryEligible(input.merchandiseSubtotalMinor, input.currency)
  ) {
    return;
  }
  throw new AppError(
    "VALIDATION",
    t(parseLocale(input.locale), "codUnavailableOverLimit"),
  );
}
