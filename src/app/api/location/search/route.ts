import { searchLocations } from "@/modules/locations";
import { AppError } from "@/shared/errors/app-error";
import { jsonError, jsonOk } from "@/shared/http/json";

const MIN_QUERY_LENGTH = 2;
const MAX_QUERY_LENGTH = 120;

export async function GET(request: Request) {
  const query = new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < MIN_QUERY_LENGTH) {
    return jsonOk({ results: [] });
  }
  if (query.length > MAX_QUERY_LENGTH) {
    return jsonError(new AppError("VALIDATION", "Location search is too long"));
  }

  try {
    return jsonOk(await searchLocations(query));
  } catch {
    return jsonError(
      new AppError(
        "INTERNAL",
        "Couldn't load address suggestions. You can continue entering the address manually.",
        503,
      ),
    );
  }
}
