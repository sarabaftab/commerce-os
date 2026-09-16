import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  openStreetMapPinUrl,
  parseOptionalLatLng,
  resolveDeliveryCoordinates,
} from "@/modules/locations/coordinates";
import { OrderFulfillmentPanel } from "@/modules/orders/components/admin/order-fulfillment-panel";
import { checkoutInputSchema } from "@/modules/orders/schemas/checkout";
import type { AdminOrderDetail } from "@/modules/orders";

const validCheckout = {
  idempotencyKey: "11111111-1111-4111-8111-111111111111",
  displayName: "Ada",
  phone: "+85512345678",
  fulfillmentMethod: "delivery" as const,
  addressLine: "12 Street",
  cityOrArea: "Phnom Penh",
  paymentMethod: "cod" as const,
};

describe("parseOptionalLatLng", () => {
  it("accepts a valid pair", () => {
    expect(parseOptionalLatLng(11.56, 104.92)).toEqual({
      latitude: 11.56,
      longitude: 104.92,
    });
  });

  it("rejects a lone coordinate or out-of-range values", () => {
    expect(parseOptionalLatLng(11.56, "")).toBeNull();
    expect(parseOptionalLatLng(91, 104.92)).toBeNull();
    expect(parseOptionalLatLng(11.56, 181)).toBeNull();
  });
});

describe("resolveDeliveryCoordinates", () => {
  const pin = { latitude: 11.55, longitude: 104.91 };

  it("never applies a pin to pickup", () => {
    expect(
      resolveDeliveryCoordinates({
        fulfillmentMethod: "pickup",
        formLatitude: pin.latitude,
        formLongitude: pin.longitude,
      }),
    ).toBeNull();
  });

  it("uses confirmed form coordinates for a new delivery address", () => {
    expect(
      resolveDeliveryCoordinates({
        fulfillmentMethod: "delivery",
        addressMode: "new",
        formLatitude: pin.latitude,
        formLongitude: pin.longitude,
      }),
    ).toEqual(pin);
  });

  it("snapshots saved-address coordinates onto the order", () => {
    expect(
      resolveDeliveryCoordinates({
        fulfillmentMethod: "delivery",
        addressMode: "saved",
        formLatitude: 1,
        formLongitude: 2,
        savedLatitude: pin.latitude,
        savedLongitude: pin.longitude,
      }),
    ).toEqual(pin);
  });

  it("allows historical text-only delivery with no coordinates", () => {
    expect(
      resolveDeliveryCoordinates({
        fulfillmentMethod: "delivery",
        addressMode: "new",
      }),
    ).toBeNull();
  });
});

describe("checkout coordinate validation", () => {
  it("persists a confirmed delivery pin without requiring it", () => {
    const parsed = checkoutInputSchema.parse({
      ...validCheckout,
      deliveryLatitude: "11.5564",
      deliveryLongitude: "104.9282",
    });
    expect(parsed.deliveryLatitude).toBeCloseTo(11.5564);
    expect(parsed.deliveryLongitude).toBeCloseTo(104.9282);
  });

  it("drops invalid pins so text-only delivery still works", () => {
    const parsed = checkoutInputSchema.parse({
      ...validCheckout,
      deliveryLatitude: "11.55",
      deliveryLongitude: "",
    });
    expect(parsed.deliveryLatitude).toBeUndefined();
    expect(parsed.deliveryLongitude).toBeUndefined();
  });

  it("does not require coordinates for pickup", () => {
    const parsed = checkoutInputSchema.parse({
      ...validCheckout,
      fulfillmentMethod: "pickup",
      addressLine: "",
      cityOrArea: "",
      pickupLocationKey: "shop-1",
    });
    expect(parsed.fulfillmentMethod).toBe("pickup");
    expect(parsed.deliveryLatitude).toBeUndefined();
  });
});

describe("Admin map link", () => {
  it("opens the exact OSM pin", () => {
    expect(
      openStreetMapPinUrl({ latitude: 11.5564, longitude: 104.9282 }),
    ).toContain("mlat=11.556400");
  });

  it("shows View Delivery Location only when the order snapshot has coordinates", () => {
    const base = {
      id: "o1",
      orderNumber: "KIN-1",
      status: "pending",
      channel: "telegram",
      currency: "USD",
      subtotalMinor: 1000,
      deliveryFeeMinor: 0,
      discountMinor: 0,
      totalMinor: 1000,
      promotionId: null,
      promotionNameSnapshot: null,
      notes: null,
      fulfillmentMethod: "delivery",
      addressLine: "12 Street",
      cityOrArea: "Phnom Penh",
      deliveryInstructions: null,
      pickupLocationKey: null,
      pickupLocationName: null,
      pickupLocationAddress: null,
      paymentMethod: "cod",
      paymentReference: null,
      paymentProofStatus: "not_required",
      paymentProofRejectionReason: null,
      placedAt: new Date("2026-09-16T00:00:00.000Z"),
      customerType: "new",
      customer: { id: "c1", displayName: "Ada", phone: null, email: null },
      items: [],
      statusHistory: [],
      allowedNextStatuses: [],
      telegramLinked: false,
      notifications: [],
    } as unknown as AdminOrderDetail;

    const withPin = renderToStaticMarkup(
      createElement(OrderFulfillmentPanel, {
        order: {
          ...base,
          deliveryLatitude: 11.5564,
          deliveryLongitude: 104.9282,
        },
      }),
    );
    expect(withPin).toContain("View Delivery Location");
    expect(withPin).toContain("mlat=11.556400");

    const withoutPin = renderToStaticMarkup(
      createElement(OrderFulfillmentPanel, {
        order: { ...base, deliveryLatitude: null, deliveryLongitude: null },
      }),
    );
    expect(withoutPin).not.toContain("View Delivery Location");
  });
});
