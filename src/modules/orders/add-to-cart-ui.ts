/** Brief hold so the customer can see success before catalog navigation. */
export const ADD_TO_CART_SUCCESS_HOLD_MS = 750;

export type AddToCartPhase = "idle" | "adding" | "added" | "error";

export function addToCartButtonLabel(
  phase: AddToCartPhase,
  idleLabel = "Add to Cart",
  labels?: { adding?: string; added?: string },
): string {
  if (phase === "adding") {
    return labels?.adding ?? "Adding…";
  }
  if (phase === "added") {
    return labels?.added ?? "✓ Added to Cart";
  }
  return idleLabel;
}

/** Canonical tenant product catalog (main browsing menu). */
export function storefrontCatalogPath(tenantSlug: string): string {
  return `/${tenantSlug}/products`;
}
