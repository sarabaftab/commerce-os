import { NextResponse } from "next/server";

import { getOrderConfirmation } from "@/modules/orders/services/checkout-service";
import { resolveTenantFromSlug } from "@/shared/cart/cart-request";
import { jsonError, jsonOk } from "@/shared/http/json";

type RouteContext = {
  params: Promise<{ tenantSlug: string; orderNumber: string }>;
};

export async function GET(_request: Request, context: RouteContext) {
  try {
    const { tenantSlug, orderNumber } = await context.params;
    const tenant = await resolveTenantFromSlug(tenantSlug);
    const order = await getOrderConfirmation(tenant.id, orderNumber);
    if (!order) {
      return NextResponse.json(
        { error: { code: "NOT_FOUND", message: "Order not found" } },
        { status: 404 },
      );
    }
    return jsonOk(order);
  } catch (error) {
    return jsonError(error);
  }
}
