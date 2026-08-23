import { NextResponse } from "next/server";

import { safeTelegramAccountPath } from "@/channels/telegram/server/account-session-path";
import { authenticateTelegramInitData } from "@/channels/telegram/server/auth-service";
import {
  attachAttributionCookie,
  attachCustomerSessionCookie,
  readCustomerSessionFromRequest,
} from "@/channels/telegram/server/customer-session";
import { mergeGuestCartIntoCustomer } from "@/modules/orders/services/cart-merge";
import { readGuestTokenFromRequest } from "@/shared/cart/cart-cookie";
import { resolveTenantFromSlug } from "@/shared/cart/cart-request";

type RouteContext = {
  params: Promise<{ tenantSlug: string }>;
};

function redirectToAccount(request: Request, tenantSlug: string, nextPath: string) {
  return NextResponse.redirect(
    new URL(safeTelegramAccountPath(tenantSlug, nextPath), request.url),
    303,
  );
}

export async function POST(request: Request, context: RouteContext) {
  const { tenantSlug } = await context.params;
  let nextPath = `/${tenantSlug}/account`;

  try {
    const form = await request.formData();
    const initData = String(form.get("initData") ?? "").trim();
    nextPath = safeTelegramAccountPath(tenantSlug, String(form.get("next") ?? ""));

    if (!initData) {
      return redirectToAccount(request, tenantSlug, nextPath);
    }

    const tenant = await resolveTenantFromSlug(tenantSlug);
    const existingSession = await readCustomerSessionFromRequest(tenant.id, request);
    const { result, sessionToken, startParam } = await authenticateTelegramInitData({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      initData,
      existingSession,
    });

    const guestToken = readGuestTokenFromRequest(request);
    if (guestToken) {
      await mergeGuestCartIntoCustomer({
        tenantId: tenant.id,
        guestToken,
        customerId: result.customerId,
      });
    }

    const response = redirectToAccount(request, tenantSlug, nextPath);
    if (sessionToken) {
      attachCustomerSessionCookie(response, sessionToken);
    }
    if (startParam) {
      attachAttributionCookie(response, startParam);
    }
    return response;
  } catch {
    return redirectToAccount(request, tenantSlug, nextPath);
  }
}
