import { getTenantBySlug } from "@/modules/identity";
import type { CartIdentity } from "@/modules/orders/services/cart-service";
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
  const guestToken = await readGuestTokenFromCookies();
  return {
    tenantId,
    guestToken,
    customerId: null,
  };
}

export function resolveCartIdentityFromRequest(
  tenantId: string,
  request: Request,
): CartIdentity {
  const guestToken = readGuestTokenFromRequest(request);
  return {
    tenantId,
    guestToken,
    customerId: null,
  };
}
