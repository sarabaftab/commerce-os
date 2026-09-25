import type { LocationSearchResult } from "./types";

/** Last-resort label when reverse geocoding cannot produce a text address. */
export const PINNED_LOCATION_FALLBACK_ADDRESS = "Pinned delivery location";

export function isPinnedLocationFallback(addressLine: string | null | undefined): boolean {
  const normalized = addressLine?.trim().toLowerCase() ?? "";
  return (
    normalized === PINNED_LOCATION_FALLBACK_ADDRESS.toLowerCase() ||
    normalized === "pinned location"
  );
}

/** Map a Photon result into checkout address field values (no invented parts). */
export function addressFieldsFromLocationResult(location: LocationSearchResult): {
  addressLine: string;
  cityOrArea: string;
  provinceOrState: string;
  postalCode: string;
  countryCode: string;
} {
  const streetLine = [location.houseNumber, location.street].filter(Boolean).join(" ");
  const cityOrArea = [location.district, location.city].filter(Boolean).join(" / ");
  return {
    addressLine: streetLine || location.formattedAddress,
    cityOrArea: cityOrArea || location.city || location.province || "",
    provinceOrState: location.province || location.city || "",
    postalCode: location.postalCode || "",
    countryCode: location.countryCode || "KH",
  };
}
