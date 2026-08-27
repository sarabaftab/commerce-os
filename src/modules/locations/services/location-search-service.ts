import { env } from "@/shared/config/env";

import type { LocationSearchResponse, LocationSearchResult } from "../types";

const PHOTON_LIMIT = 8;
const PHOTON_TIMEOUT_MS = 5000;

type PhotonFeature = {
  id?: unknown;
  properties?: Record<string, unknown>;
  geometry?: { coordinates?: unknown };
};

function stringValue(value: unknown): string | null {
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function numberValue(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null;
}

function uniqueAddressParts(parts: (string | null)[]) {
  const seen = new Set<string>();
  return parts.filter((part): part is string => {
    if (!part) {
      return false;
    }
    const key = part.toLocaleLowerCase();
    if (seen.has(key)) {
      return false;
    }
    seen.add(key);
    return true;
  });
}

export function normalizePhotonFeature(
  feature: PhotonFeature,
  index: number,
): LocationSearchResult | null {
  const properties = feature.properties ?? {};
  const houseNumber = stringValue(properties.housenumber);
  const street = stringValue(properties.street);
  const district =
    stringValue(properties.district) ??
    stringValue(properties.suburb) ??
    stringValue(properties.locality);
  const city =
    stringValue(properties.city) ??
    stringValue(properties.town) ??
    stringValue(properties.village) ??
    stringValue(properties.county);
  const province = stringValue(properties.state);
  const postalCode = stringValue(properties.postcode);
  const country = stringValue(properties.country);
  const countryCode = stringValue(properties.countrycode)?.toUpperCase() ?? null;
  const name = stringValue(properties.name);
  const addressLine = [houseNumber, street].filter(Boolean).join(" ");
  const addressParts = uniqueAddressParts([
    addressLine || name,
    district,
    city,
    province,
    postalCode,
    country,
  ]);
  const formattedAddress = addressParts.join(", ");
  if (!formattedAddress) {
    return null;
  }

  const coordinates = feature.geometry?.coordinates;
  const longitude = Array.isArray(coordinates) ? numberValue(coordinates[0]) : null;
  const latitude = Array.isArray(coordinates) ? numberValue(coordinates[1]) : null;
  const providerId = stringValue(feature.id) ?? stringValue(properties.osm_id);

  return {
    id: providerId ? `photon:${providerId}` : `photon:${index}:${formattedAddress}`,
    label: name && name !== addressLine ? `${name}, ${formattedAddress}` : formattedAddress,
    formattedAddress,
    street,
    houseNumber,
    district,
    city,
    province,
    postalCode,
    country,
    countryCode,
    latitude,
    longitude,
    provider: "photon",
  };
}

export function rankLocationResults(
  results: LocationSearchResult[],
  preferences: { countryCode: string; city: string },
) {
  const city = preferences.city.toLocaleLowerCase();
  return results
    .map((result, index) => ({
      result,
      index,
      score:
        (result.countryCode === preferences.countryCode.toUpperCase() ? 100 : 0) +
        (result.city?.toLocaleLowerCase().includes(city) ? 10 : 0),
    }))
    .sort((a, b) => b.score - a.score || a.index - b.index)
    .map(({ result }) => result);
}

export async function searchLocations(query: string): Promise<LocationSearchResponse> {
  const settings = env();
  const endpoint = new URL(settings.PHOTON_BASE_URL);
  endpoint.searchParams.set("q", query);
  endpoint.searchParams.set("limit", String(PHOTON_LIMIT));
  endpoint.searchParams.set("lang", "en");
  endpoint.searchParams.set("countrycode", settings.PHOTON_COUNTRY_CODE.toLowerCase());

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), PHOTON_TIMEOUT_MS);
  try {
    const response = await fetch(endpoint, {
      signal: controller.signal,
      headers: { accept: "application/json" },
    });
    if (!response.ok) {
      throw new Error(`Photon returned ${response.status}`);
    }
    const payload: unknown = await response.json();
    const features =
      typeof payload === "object" &&
      payload !== null &&
      "features" in payload &&
      Array.isArray(payload.features)
        ? payload.features
        : [];
    const results = features
      .map((feature, index) =>
        typeof feature === "object" && feature !== null
        ? normalizePhotonFeature(feature as PhotonFeature, index)
          : null,
      )
      .filter((result): result is LocationSearchResult => result !== null);

    return {
      results: rankLocationResults(results, {
        countryCode: settings.PHOTON_COUNTRY_CODE,
        city: settings.PHOTON_BIAS_CITY,
      }).slice(0, PHOTON_LIMIT),
    };
  } finally {
    clearTimeout(timeout);
  }
}
