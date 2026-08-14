export const CART_CHANGED_EVENT = "commerceos:cart-changed";

/** Notify header chrome to refresh the badge without a full navigation refetch. */
export function notifyCartChanged() {
  if (typeof window === "undefined") {
    return;
  }
  window.dispatchEvent(new Event(CART_CHANGED_EVENT));
}
