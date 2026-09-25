import { reverseGeocodeLatLng } from "@/modules/locations";
import { parseOptionalLatLng } from "@/modules/locations/coordinates";
import { AppError } from "@/shared/errors/app-error";
import { jsonError, jsonOk } from "@/shared/http/json";

export async function GET(request: Request) {
  const params = new URL(request.url).searchParams;
  const point = parseOptionalLatLng(params.get("lat"), params.get("lng") ?? params.get("lon"));

  if (!point) {
    return jsonError(new AppError("VALIDATION", "Valid latitude and longitude are required"));
  }

  try {
    const result = await reverseGeocodeLatLng(point);
    return jsonOk({ result });
  } catch {
    return jsonError(
      new AppError(
        "INTERNAL",
        "Couldn't resolve this map pin to an address. You can continue with the pin.",
        503,
      ),
    );
  }
}
