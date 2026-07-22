import { AppError } from "@/shared/errors/app-error";

import type { DeliveryFeeInput } from "../types";

export function computeDeliveryFeeMinor(input: DeliveryFeeInput): number {
  if (input.fulfillmentMethod !== "delivery") {
    return 0;
  }
  if (!input.deliveryEnabled) {
    throw new AppError("VALIDATION", "Delivery is not available");
  }
  if (
    input.freeDeliveryThresholdMinor != null &&
    input.subtotalMinor >= input.freeDeliveryThresholdMinor
  ) {
    return 0;
  }
  return input.deliveryFeeMinor;
}
