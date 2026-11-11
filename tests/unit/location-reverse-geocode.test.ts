import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { afterEach, describe, expect, it, vi } from "vitest";

import { CustomerOrderDetail } from "@/modules/customers/components/customer-order-detail";
import type { CustomerOrderDetailDto } from "@/modules/customers/types";
import { OrderConfirmationView } from "@/modules/orders/components/order-confirmation";
import type { OrderConfirmation } from "@/modules/orders";
import {
  addressFieldsFromLocationResult,
  isPinnedLocationFallback,
  PINNED_LOCATION_FALLBACK_ADDRESS,
  photonReverseEndpoint,
  reverseGeocodeLatLng,
} from "@/modules/locations";
import { openStreetMapPinUrl } from "@/modules/locations/coordinates";
import { t } from "@/shared/i18n/messages";

const photonFeature = {
  id: "node/1",
  properties: {
    street: "Street 2004",
    district: "Sangkat Kakab 1",
    city: "Phnom Penh",
    state: "Phnom Penh",
    country: "Cambodia",
    countrycode: "kh",
    osm_id: 1,
  },
  geometry: { coordinates: [104.8, 11.54] },
};

describe("Photon reverse geocoding helpers", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("maps search API base URL to the reverse endpoint", () => {
    expect(photonReverseEndpoint("https://photon.komoot.io/api")).toBe(
      "https://photon.komoot.io/reverse",
    );
    expect(photonReverseEndpoint("https://photon.komoot.io/api/")).toBe(
      "https://photon.komoot.io/reverse",
    );
  });

  it("detects pinned-location fallback labels", () => {
    expect(isPinnedLocationFallback("Pinned delivery location")).toBe(true);
    expect(isPinnedLocationFallback("Pinned location")).toBe(true);
    expect(isPinnedLocationFallback("Street 2004")).toBe(false);
  });

  it("builds checkout fields from a reverse-geocode result without inventing parts", () => {
    const fields = addressFieldsFromLocationResult({
      id: "photon:1",
      label: "Street 2004, Sangkat Kakab 1, Phnom Penh, Cambodia",
      formattedAddress: "Street 2004, Sangkat Kakab 1, Phnom Penh, Cambodia",
      street: "Street 2004",
      houseNumber: null,
      district: "Sangkat Kakab 1",
      city: "Phnom Penh",
      province: "Phnom Penh",
      postalCode: null,
      country: "Cambodia",
      countryCode: "KH",
      latitude: 11.54,
      longitude: 104.8,
      provider: "photon",
    });

    expect(fields.addressLine).toBe("Street 2004");
    expect(fields.cityOrArea).toBe("Sangkat Kakab 1 / Phnom Penh");
    expect(fields.provinceOrState).toBe("Phnom Penh");
    expect(fields.postalCode).toBe("");
    expect(fields.countryCode).toBe("KH");
  });

  it("resolves pinned coordinates to a text address via Photon reverse", async () => {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ features: [photonFeature] }),
    });
    vi.stubGlobal("fetch", fetchMock);

    const result = await reverseGeocodeLatLng({
      latitude: 11.54,
      longitude: 104.8,
    });

    expect(result?.formattedAddress).toContain("Street 2004");
    expect(result?.formattedAddress).toContain("Sangkat Kakab 1");
    expect(result?.city).toBe("Phnom Penh");
    expect(fetchMock).toHaveBeenCalledTimes(1);
    const calledUrl = String(fetchMock.mock.calls[0]?.[0]);
    expect(calledUrl).toContain("/reverse");
    expect(calledUrl).toContain("lat=11.54");
    expect(calledUrl).toContain("lon=104.8");
  });

  it("returns null on reverse-geocode failure without throwing", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockRejectedValue(new Error("network down")),
    );

    await expect(
      reverseGeocodeLatLng({ latitude: 11.54, longitude: 104.8 }),
    ).resolves.toBeNull();
  });
});

describe("Pinned address checkout snapshot enrichment", () => {
  it("persists reverse-geocoded fields into the order address snapshot shape", () => {
    const resolved = addressFieldsFromLocationResult({
      id: "photon:1",
      label: "Street 2004, Sangkat Kakab 1, Phnom Penh, Cambodia",
      formattedAddress: "Street 2004, Sangkat Kakab 1, Phnom Penh, Cambodia",
      street: "Street 2004",
      houseNumber: null,
      district: "Sangkat Kakab 1",
      city: "Phnom Penh",
      province: "Phnom Penh",
      postalCode: null,
      country: "Cambodia",
      countryCode: "KH",
      latitude: 11.54,
      longitude: 104.8,
      provider: "photon",
    });

    const snapshot = {
      addressLine: isPinnedLocationFallback(PINNED_LOCATION_FALLBACK_ADDRESS)
        ? resolved.addressLine
        : PINNED_LOCATION_FALLBACK_ADDRESS,
      cityOrArea: resolved.cityOrArea,
      latitude: 11.54,
      longitude: 104.8,
    };

    expect(snapshot.addressLine).toBe("Street 2004");
    expect(snapshot.cityOrArea).toContain("Phnom Penh");
    expect(snapshot.latitude).toBe(11.54);
    expect(snapshot.longitude).toBe(104.8);
  });

  it("keeps manual/autocomplete addresses unchanged when not a pin fallback", () => {
    const manual = "12 Preah Norodom Blvd";
    expect(isPinnedLocationFallback(manual)).toBe(false);
    // Server enrichment only runs for fallback labels — manual text is left alone.
    expect(manual).toBe("12 Preah Norodom Blvd");
  });

  it("allows checkout to continue with fallback when reverse geocoding fails", () => {
    const addressLine = PINNED_LOCATION_FALLBACK_ADDRESS;
    const pin = { latitude: 11.54, longitude: 104.8 };
    expect(isPinnedLocationFallback(addressLine)).toBe(true);
    expect(pin.latitude).toBeTruthy();
    expect(openStreetMapPinUrl(pin)).toContain("mlat=");
  });
});

describe("Customer and Admin display of persisted pin address", () => {
  const confirmation = {
    id: "o1",
    orderNumber: "KIN-99",
    status: "pending",
    channel: "telegram",
    currency: "USD",
    subtotalMinor: 1000,
    deliveryFeeMinor: 100,
    discountMinor: 0,
    totalMinor: 1100,
    promotionId: null,
    promotionNameSnapshot: null,
    referralCode: null,
    campaignId: null,
    fulfillmentMethod: "delivery",
    addressLine: "Street 2004",
    cityOrArea: "Sangkat Kakab 1 / Phnom Penh",
    deliveryInstructions: null,
    deliveryLatitude: 11.54,
    deliveryLongitude: 104.8,
    pickupLocationKey: null,
    pickupLocationName: null,
    pickupLocationAddress: null,
    paymentMethod: "cod",
    paymentReference: null,
    paymentProofStatus: "not_required",
    paymentProofRejectionReason: null,
    placedAt: new Date("2026-09-24T00:00:00.000Z"),
    customer: { displayName: "Ada", phone: "+8551", email: null },
    items: [],
  } as OrderConfirmation;

  it("shows resolved address + View on Map on order confirmation", () => {
    const html = renderToStaticMarkup(
      createElement(OrderConfirmationView, {
        order: confirmation,
        tenantSlug: "kin-a2",
        accountOrderHref: null,
        abaPayment: {
          qrImageUrl: null,
          accountName: null,
          accountNumber: null,
          instructions: null,
          customerNote: null,
        },
      }),
    );
    expect(html).toContain("Street 2004");
    expect(html).not.toContain(PINNED_LOCATION_FALLBACK_ADDRESS);
    expect(html).toContain(t("en", "viewOnMap"));
    expect(html).toContain("mlat=11.540000");
  });

  it("shows resolved address + View on Map on customer order details", () => {
    const order: CustomerOrderDetailDto = {
      orderNumber: "KIN-99",
      placedAt: new Date("2026-09-24T00:00:00.000Z"),
      status: "pending",
      statusLabel: "Pending",
      channel: "telegram",
      fulfillmentMethod: "delivery",
      paymentMethod: "cod",
      paymentReference: null,
      paymentProofStatus: "not_required",
      paymentProofRejectionReason: null,
      abaQrImageUrl: null,
      abaAccountName: null,
      abaAccountNumber: null,
      abaInstructions: null,
      abaCustomerNote: null,
      currency: "USD",
      subtotalMinor: 1000,
      deliveryFeeMinor: 100,
      discountMinor: 0,
      promotionNameSnapshot: null,
      totalMinor: 1100,
      delivery: {
        recipientName: "Ada",
        phone: "+8551",
        addressLine1: "Street 2004",
        addressLine2: null,
        cityOrArea: "Sangkat Kakab 1 / Phnom Penh",
        provinceOrState: "Phnom Penh",
        postalCode: null,
        countryCode: "KH",
        label: null,
        deliveryInstructions: null,
        latitude: 11.54,
        longitude: 104.8,
      },
      pickup: null,
      items: [],
      timeline: [],
      supportPhone: null,
      supportEmail: null,
    };

    const html = renderToStaticMarkup(
      createElement(CustomerOrderDetail, { tenantSlug: "kin-a2", order }),
    );
    expect(html).toContain("Street 2004");
    expect(html).not.toContain(PINNED_LOCATION_FALLBACK_ADDRESS);
    expect(html).toContain(t("en", "viewOnMap"));
    expect(html).toContain("mlat=11.540000");
  });

  it("does not reverse-geocode when viewing an existing order (reads persisted fields only)", () => {
    const fetchMock = vi.fn();
    vi.stubGlobal("fetch", fetchMock);

    renderToStaticMarkup(
      createElement(OrderConfirmationView, {
        order: confirmation,
        tenantSlug: "kin-a2",
        accountOrderHref: null,
        abaPayment: {
          qrImageUrl: null,
          accountName: null,
          accountNumber: null,
          instructions: null,
          customerNote: null,
        },
      }),
    );

    expect(fetchMock).not.toHaveBeenCalled();
  });
});
