/** Brief hold so the customer can see success before catalog navigation. */
export const ADD_TO_CART_SUCCESS_HOLD_MS = 750;

export type AddToCartPhase = "idle" | "adding" | "added" | "error";

export function addToCartButtonLabel(
  phase: AddToCartPhase,
  labels: { idle: string; adding: string; added: string },
): string {
  if (phase === "adding") {
    return labels.adding;
  }
  if (phase === "added") {
    return labels.added;
  }
  return labels.idle;
}

/** Canonical tenant product catalog (main browsing menu). */
export function storefrontCatalogPath(tenantSlug: string): string {
  return `/${tenantSlug}/products`;
}
