import { NextResponse } from "next/server";

import { getOptionalCustomerSession } from "@/modules/customers";
import { getAuthorizedOrderConfirmation } from "@/modules/orders/services/checkout-service";
import { resolveTenantFromSlug } from "@/shared/cart/cart-request";
import { jsonError, jsonOk } from "@/shared/http/json";
import { readOrderConfirmationTokenFromRequest } from "@/shared/orders/confirmation-cookie";

type RouteContext = {
  params: Promise<{ tenantSlug: string; orderNumber: string }>;
};

export async function GET(request: Request, context: RouteContext) {
  try {
    const { tenantSlug, orderNumber } = await context.params;
    const tenant = await resolveTenantFromSlug(tenantSlug);
    const session = await getOptionalCustomerSession(tenant.id);
    const token = readOrderConfirmationTokenFromRequest(request, orderNumber);

    const order = await getAuthorizedOrderConfirmation({
      tenantId: tenant.id,
      orderNumber,
      confirmationToken: token,
      customerId: session?.customerId ?? null,
    });

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
