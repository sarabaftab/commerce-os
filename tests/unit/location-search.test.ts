import { describe, expect, it } from "vitest";

import {
  normalizePhotonFeature,
  rankLocationResults,
} from "@/modules/locations/services/location-search-service";

describe("Photon location normalization", () => {
  it("normalizes address fields and coordinates without raw provider data", () => {
    const result = normalizePhotonFeature(
      {
        id: "way/123",
        properties: {
          name: "Preah Norodom Boulevard",
          housenumber: "271",
          street: "Preah Norodom Blvd",
          district: "Chamkar Mon",
          city: "Phnom Penh",
          state: "Phnom Penh",
          country: "Cambodia",
          countrycode: "kh",
          postcode: "12301",
          osm_id: 123,
        },
        geometry: { coordinates: [104.9282, 11.5564] },
      },
      0,
    );

    expect(result).toMatchObject({
      id: "photon:way/123",
      label: "Preah Norodom Boulevard, 271 Preah Norodom Blvd, Chamkar Mon, Phnom Penh, 12301, Cambodia",
      formattedAddress:
        "271 Preah Norodom Blvd, Chamkar Mon, Phnom Penh, 12301, Cambodia",
      street: "Preah Norodom Blvd",
      houseNumber: "271",
      district: "Chamkar Mon",
      city: "Phnom Penh",
      province: "Phnom Penh",
      countryCode: "KH",
      latitude: 11.5564,
      longitude: 104.9282,
      provider: "photon",
    });
  });

  it("prioritizes the configured country and city", () => {
    const cambodia = normalizePhotonFeature(
      { properties: { city: "Phnom Penh", countrycode: "kh", country: "Cambodia" } },
      0,
    )!;
    const otherCountry = normalizePhotonFeature(
      { properties: { city: "Phnom Penh", countrycode: "us", country: "United States" } },
      1,
    )!;

    expect(
      rankLocationResults([otherCountry, cambodia], {
        countryCode: "KH",
        city: "Phnom Penh",
      }),
    ).toEqual([cambodia, otherCountry]);
  });
});
