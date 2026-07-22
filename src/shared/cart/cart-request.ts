import { getTenantBySlug } from "@/modules/identity";
import type { CartIdentity } from "@/modules/orders/services/cart-service";
import {
  readCustomerSessionFromCookies,
  readCustomerSessionFromRequest,
} from "@/channels/telegram/server/customer-session";
import { AppError, isAppError } from "@/shared/errors/app-error";
import {
  readGuestTokenFromCookies,
  readGuestTokenFromRequest,
} from "@/shared/cart/cart-cookie";

export async function resolveTenantFromSlug(tenantSlug: string) {
  try {
    return await getTenantBySlug(tenantSlug);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      throw new AppError("NOT_FOUND", "Store not found");
    }
    throw error;
  }
}

export async function resolveCartIdentityFromCookies(
  tenantId: string,
): Promise<CartIdentity> {
  const [guestToken, session] = await Promise.all([
    readGuestTokenFromCookies(),
    readCustomerSessionFromCookies(tenantId),
  ]);
  return {
    tenantId,
    guestToken,
    customerId: session?.customerId ?? null,
  };
}

export async function resolveCartIdentityFromRequest(
  tenantId: string,
  request: Request,
): Promise<CartIdentity> {
  const guestToken = readGuestTokenFromRequest(request);
  const session = await readCustomerSessionFromRequest(tenantId, request);
  return {
    tenantId,
    guestToken,
    customerId: session?.customerId ?? null,
  };
}
