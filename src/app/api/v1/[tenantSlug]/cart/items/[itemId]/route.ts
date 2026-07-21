import { NextResponse } from "next/server";

import { removeCartItem, updateCartItemQty } from "@/modules/orders";
import { updateCartItemSchema } from "@/modules/orders/schemas/cart";
import { attachCartCookie } from "@/shared/cart/cart-cookie";
import {
  resolveCartIdentityFromRequest,
  resolveTenantFromSlug,
} from "@/shared/cart/cart-request";
import { jsonError, jsonOk } from "@/shared/http/json";

type RouteContext = {
  params: Promise<{ tenantSlug: string; itemId: string }>;
};

export async function PATCH(request: Request, context: RouteContext) {
  try {
    const { tenantSlug, itemId } = await context.params;
    const tenant = await resolveTenantFromSlug(tenantSlug);
    const identity = resolveCartIdentityFromRequest(tenant.id, request);

    const body = await request.json();
    const parsed = updateCartItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: parsed.error.message } },
        { status: 400 },
      );
    }

    const result = await updateCartItemQty(
      identity,
      tenant.currency,
      itemId,
      parsed.data.quantity,
    );
    const response = jsonOk(result.summary);
    if (result.guestToken) {
      attachCartCookie(response, result.guestToken);
    }
    return response;
  } catch (error) {
    return jsonError(error);
  }
}

export async function DELETE(request: Request, context: RouteContext) {
  try {
    const { tenantSlug, itemId } = await context.params;
    const tenant = await resolveTenantFromSlug(tenantSlug);
    const identity = resolveCartIdentityFromRequest(tenant.id, request);

    const result = await removeCartItem(identity, tenant.currency, itemId);
    const response = jsonOk(result.summary);
    if (result.guestToken) {
      attachCartCookie(response, result.guestToken);
    }
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
