export type OrderCustomerType = "new" | "returning";

/** Customer-list lifecycle label (based on total placed orders). */
export type CustomerLifecycleLabel = "New" | "Returning";

export type OrderSequenceKey = {
  id: string;
  placedAt: Date;
};

/**
 * All Order rows are placed checkout orders (carts are separate).
 * Cancelled orders still count toward New/Returning sequence — they were real placements.
 * Lifetime value excludes cancelled (see admin customer profile service).
 */
export function compareOrderSequence(a: OrderSequenceKey, b: OrderSequenceKey): number {
  const byTime = a.placedAt.getTime() - b.placedAt.getTime();
  if (byTime !== 0) {
    return byTime;
  }
  return a.id.localeCompare(b.id);
}

export function isFirstOrderForCustomer(
  order: OrderSequenceKey,
  firstOrder: OrderSequenceKey | null | undefined,
): boolean {
  if (!firstOrder) {
    return true;
  }
  return order.id === firstOrder.id;
}

export function resolveOrderCustomerType(
  order: OrderSequenceKey,
  firstOrder: OrderSequenceKey | null | undefined,
): OrderCustomerType {
  return isFirstOrderForCustomer(order, firstOrder) ? "new" : "returning";
}

export function orderCustomerTypeLabel(type: OrderCustomerType): string {
  return type === "new" ? "New Customer" : "Returning Customer";
}

export function customerLifecycleLabel(totalOrders: number): CustomerLifecycleLabel {
  return totalOrders <= 1 ? "New" : "Returning";
}
