import {
  clearCart,
  getOrCreateCart,
} from "@/modules/orders";
import {
  attachCartCookie,
} from "@/shared/cart/cart-cookie";
import {
  resolveCartIdentityFromRequest,
  resolveTenantFromSlug,
} from "@/shared/cart/cart-request";
import { jsonError, jsonOk } from "@/shared/http/json";

type RouteContext = {
  params: Promise<{ tenantSlug: string }>;
};

function withCartCookie<T>(
  result: { summary: T; guestToken?: string },
  responseInit?: ResponseInit,
) {
  const response = jsonOk(result.summary, responseInit);
  if (result.guestToken) {
    attachCartCookie(response, result.guestToken);
  }
  return response;
}

export async function GET(request: Request, context: RouteContext) {
  try {
    const { tenantSlug } = await context.params;
    const tenant = await resolveTenantFromSlug(tenantSlug);
    const identity = await resolveCartIdentityFromRequest(tenant.id, request);
    const url = new URL(request.url);

    // Header badge: lean count without creating an empty cart.
    if (url.searchParams.get("view") === "count") {
      const { getCartItemCount } = await import("@/modules/orders");
      const itemCount = await getCartItemCount(identity);
      return jsonOk({ itemCount });
    }

    const result = await getOrCreateCart(identity, tenant.currency);
    return withCartCookie(result);
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { tenantSlug } = await context.params;
    const tenant = await resolveTenantFromSlug(tenantSlug);
    const identity = await resolveCartIdentityFromRequest(tenant.id, request);

    const result = await clearCart(identity, tenant.currency);
    return withCartCookie(result);
  } catch (error) {
    return jsonError(error);
  }
}
