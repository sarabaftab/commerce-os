import { getAdminSession } from "@/shared/auth/admin-session";
import { AppError } from "@/shared/errors/app-error";
import { jsonError, jsonOk } from "@/shared/http/json";
import { parseDashboardRange } from "@/modules/orders/dashboard-range";
import { getAdminDashboardLiveSnapshot } from "@/modules/orders/services/dashboard-stats-service";

export const dynamic = "force-dynamic";

/**
 * Lightweight Admin dashboard snapshot for background polling.
 * Tenant is resolved from the Admin session only — never from client input.
 */
export async function GET(request: Request) {
  try {
    const session = await getAdminSession();
    if (!session) {
      throw new AppError("UNAUTHORIZED", "Authentication required");
    }

    const url = new URL(request.url);
    const range = parseDashboardRange(url.searchParams.get("range") ?? undefined);
    const snapshot = await getAdminDashboardLiveSnapshot(session.tenantId, range);

    return jsonOk(snapshot, {
      headers: {
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    return jsonError(error);
  }
}
