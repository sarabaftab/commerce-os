import { NextResponse } from "next/server";

import { addItemToCart } from "@/modules/orders";
import { addCartItemSchema } from "@/modules/orders/schemas/cart";
import { attachCartCookie } from "@/shared/cart/cart-cookie";
import {
  resolveCartIdentityFromRequest,
  resolveTenantFromSlug,
} from "@/shared/cart/cart-request";
import { jsonError, jsonOk } from "@/shared/http/json";

type RouteContext = {
  params: Promise<{ tenantSlug: string }>;
};

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tenantSlug } = await context.params;
    const tenant = await resolveTenantFromSlug(tenantSlug);
    const identity = resolveCartIdentityFromRequest(tenant.id, request);

    const body = await request.json();
    const parsed = addCartItemSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json(
        { error: { code: "VALIDATION", message: parsed.error.message } },
        { status: 400 },
      );
    }

    const result = await addItemToCart(identity, tenant.currency, parsed.data);
    const response = jsonOk(result.summary, { status: 201 });
    if (result.guestToken) {
      attachCartCookie(response, result.guestToken);
    }
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
