import { describe, expect, it } from "vitest";

import { AppError } from "@/shared/errors/app-error";
import { computeDeliveryFeeMinor } from "@/modules/settings/services/delivery-fee";
import {
  deliverySettingsSchema,
  paymentSettingsSchema,
} from "@/modules/settings/schemas/settings";

describe("computeDeliveryFeeMinor", () => {
  it("returns 0 for pickup", () => {
    expect(
      computeDeliveryFeeMinor({
        fulfillmentMethod: "pickup",
        subtotalMinor: 1000,
        deliveryEnabled: true,
        deliveryFeeMinor: 200,
        freeDeliveryThresholdMinor: null,
      }),
    ).toBe(0);
  });

  it("applies flat delivery fee", () => {
    expect(
      computeDeliveryFeeMinor({
        fulfillmentMethod: "delivery",
        subtotalMinor: 1000,
        deliveryEnabled: true,
        deliveryFeeMinor: 200,
        freeDeliveryThresholdMinor: null,
      }),
    ).toBe(200);
  });

  it("applies free delivery threshold", () => {
    expect(
      computeDeliveryFeeMinor({
        fulfillmentMethod: "delivery",
        subtotalMinor: 5000,
        deliveryEnabled: true,
        deliveryFeeMinor: 200,
        freeDeliveryThresholdMinor: 4000,
      }),
    ).toBe(0);
  });

  it("rejects delivery when disabled", () => {
    expect(() =>
      computeDeliveryFeeMinor({
        fulfillmentMethod: "delivery",
        subtotalMinor: 1000,
        deliveryEnabled: false,
        deliveryFeeMinor: 200,
        freeDeliveryThresholdMinor: null,
      }),
    ).toThrow(AppError);
  });
});

describe("paymentSettingsSchema", () => {
  it("requires ABA fields when ABA enabled", () => {
    const parsed = paymentSettingsSchema.safeParse({
      codEnabled: true,
      abaEnabled: true,
      abaAccountName: "",
      abaAccountNumber: "",
      abaInstructions: "",
    });
    expect(parsed.success).toBe(false);
  });

  it("allows ABA disabled without account fields", () => {
    const parsed = paymentSettingsSchema.safeParse({
      codEnabled: true,
      abaEnabled: false,
      abaAccountName: "",
      abaAccountNumber: "",
      abaInstructions: "",
    });
    expect(parsed.success).toBe(true);
  });
});

describe("deliverySettingsSchema", () => {
  it("accepts blank free delivery threshold as null", () => {
    const parsed = deliverySettingsSchema.parse({
      deliveryEnabled: true,
      pickupEnabled: true,
      deliveryFeeMinor: 0,
      freeDeliveryThresholdMinor: "",
      deliveryNotes: "",
    });
    expect(parsed.freeDeliveryThresholdMinor).toBeNull();
  });
});
