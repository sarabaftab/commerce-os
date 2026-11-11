export type LatLng = {
  latitude: number;
  longitude: number;
};

export function isValidLatitude(value: number): boolean {
  return Number.isFinite(value) && value >= -90 && value <= 90;
}

export function isValidLongitude(value: number): boolean {
  return Number.isFinite(value) && value >= -180 && value <= 180;
}

function toFiniteNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }
  if (typeof value === "string" && value.trim()) {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : null;
  }
  return null;
}

/** Require a valid pair; a lone lat or lng is ignored. */
export function parseOptionalLatLng(
  latitude: unknown,
  longitude: unknown,
): LatLng | null {
  const lat = toFiniteNumber(latitude);
  const lng = toFiniteNumber(longitude);
  if (lat == null || lng == null) {
    return null;
  }
  if (!isValidLatitude(lat) || !isValidLongitude(lng)) {
    return null;
  }
  return { latitude: lat, longitude: lng };
}

export function sameLatLng(a: LatLng, b: LatLng, epsilon = 1e-7): boolean {
  return (
    Math.abs(a.latitude - b.latitude) < epsilon &&
    Math.abs(a.longitude - b.longitude) < epsilon
  );
}

/** External OSM pin for Admin/staff navigation — not an in-app map. */
export function openStreetMapPinUrl(point: LatLng): string {
  const lat = point.latitude.toFixed(6);
  const lng = point.longitude.toFixed(6);
  return `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=18/${lat}/${lng}`;
}

/**
 * Pickup never stores a delivery pin.
 * Saved-address checkout snapshots the address coords; new-address uses confirmed form coords.
 */
export function resolveDeliveryCoordinates(input: {
  fulfillmentMethod: "delivery" | "pickup";
  addressMode?: "saved" | "new";
  formLatitude?: unknown;
  formLongitude?: unknown;
  savedLatitude?: unknown;
  savedLongitude?: unknown;
}): LatLng | null {
  if (input.fulfillmentMethod !== "delivery") {
    return null;
  }
  if (input.addressMode === "saved") {
    return parseOptionalLatLng(input.savedLatitude, input.savedLongitude);
  }
  return parseOptionalLatLng(input.formLatitude, input.formLongitude);
}
