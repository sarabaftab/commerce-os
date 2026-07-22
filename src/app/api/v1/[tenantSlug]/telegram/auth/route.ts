import { z } from "zod";

import {
  applyTelegramAuthCookies,
  authenticateTelegramInitData,
} from "@/channels/telegram/server/auth-service";
import { mergeGuestCartIntoCustomer } from "@/modules/orders/services/cart-merge";
import { readGuestTokenFromRequest } from "@/shared/cart/cart-cookie";
import { resolveTenantFromSlug } from "@/shared/cart/cart-request";
import { AppError } from "@/shared/errors/app-error";
import { jsonError, jsonOk } from "@/shared/http/json";

type RouteContext = {
  params: Promise<{ tenantSlug: string }>;
};

const bodySchema = z.object({
  initData: z.string().min(1, "initData is required"),
});

export async function POST(request: Request, context: RouteContext) {
  try {
    const { tenantSlug } = await context.params;
    const tenant = await resolveTenantFromSlug(tenantSlug);
    const json = await request.json();
    const parsed = bodySchema.safeParse(json);
    if (!parsed.success) {
      throw new AppError(
        "VALIDATION",
        parsed.error.issues[0]?.message ?? "Invalid body",
      );
    }

    const { result, sessionToken, startParam } = await authenticateTelegramInitData({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      initData: parsed.data.initData,
    });

    const guestToken = readGuestTokenFromRequest(request);
    await mergeGuestCartIntoCustomer({
      tenantId: tenant.id,
      guestToken,
      customerId: result.customerId,
    });

    const response = jsonOk({
      customerId: result.customerId,
      displayName: result.displayName,
      isNewCustomer: result.isNewCustomer,
      startParam: result.startParam ?? null,
    });

    applyTelegramAuthCookies(response, sessionToken, startParam);
    return response;
  } catch (error) {
    return jsonError(error);
  }
}
