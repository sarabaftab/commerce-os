import { placeOrderFromJson } from "@/modules/orders/actions/checkout-actions";
import { readGuestTokenFromRequest } from "@/shared/cart/cart-cookie";
import { resolveTenantFromSlug } from "@/shared/cart/cart-request";
import { jsonError, jsonOk } from "@/shared/http/json";

type RouteContext = {
  params: Promise<{ tenantSlug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tenantSlug } = await context.params;
    await resolveTenantFromSlug(tenantSlug);
    const guestToken = readGuestTokenFromRequest(request);
    const body = await request.json();

    const headerKey = request.headers.get("Idempotency-Key");
    if (headerKey && typeof body === "object" && body !== null && !("idempotencyKey" in body)) {
      (body as Record<string, unknown>).idempotencyKey = headerKey;
    }

    const order = await placeOrderFromJson(tenantSlug, body, guestToken);
    return jsonOk(order, { status: 201 });
  } catch (error) {
    return jsonError(error);
  }
}
