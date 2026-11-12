import { placeOrderFromJson } from "@/modules/orders/actions/checkout-actions";
import { readGuestTokenFromRequest } from "@/shared/cart/cart-cookie";
import { resolveTenantFromSlug } from "@/shared/cart/cart-request";
import { jsonError, jsonOk } from "@/shared/http/json";
import {
  assertRateLimit,
  getClientIp,
  RATE_LIMITS,
} from "@/shared/http/rate-limit";
import { attachOrderConfirmationCookie } from "@/shared/orders/confirmation-cookie";

type RouteContext = {
  params: Promise<{ tenantSlug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tenantSlug } = await context.params;
    const guestToken = readGuestTokenFromRequest(request);
    assertRateLimit(
      `checkout:${tenantSlug}:${guestToken ?? getClientIp(request)}`,
      RATE_LIMITS.checkout,
    );
    await resolveTenantFromSlug(tenantSlug);
    const body = await request.json();

    const headerKey = request.headers.get("Idempotency-Key");
    if (headerKey && typeof body === "object" && body !== null && !("idempotencyKey" in body)) {
      (body as Record<string, unknown>).idempotencyKey = headerKey;
    }

    const order = await placeOrderFromJson(tenantSlug, body, request);
    const { confirmationToken, ...publicOrder } = order;
    const response = jsonOk(publicOrder, { status: 201 });
    if (confirmationToken) {
      attachOrderConfirmationCookie(response, order.orderNumber, confirmationToken);
    }
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
