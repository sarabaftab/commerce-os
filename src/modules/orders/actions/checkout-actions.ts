"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { getTenantBySlug } from "@/modules/identity";
import { readGuestTokenFromCookies } from "@/shared/cart/cart-cookie";
import { AppError, isAppError } from "@/shared/errors/app-error";

import {
  checkoutFormDataToObject,
  checkoutInputSchema,
} from "../schemas/checkout";
import { placeGuestOrder } from "../services/checkout-service";

export type PlaceOrderActionState = {
  error?: string;
};

function isNextRedirect(error: unknown): boolean {
  return (
    typeof error === "object" &&
    error !== null &&
    "digest" in error &&
    typeof (error as { digest?: string }).digest === "string" &&
    (error as { digest: string }).digest.startsWith("NEXT_REDIRECT")
  );
}

export async function placeOrderAction(
  tenantSlug: string,
  _prevState: PlaceOrderActionState,
  formData: FormData,
): Promise<PlaceOrderActionState> {
  const tenant = await getTenantBySlug(tenantSlug);
  const guestToken = await readGuestTokenFromCookies();

  const parsed = checkoutInputSchema.safeParse(checkoutFormDataToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid checkout details" };
  }

  try {
    const order = await placeGuestOrder(
      {
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        currency: tenant.currency,
        tenantConfig: tenant.config,
        cartIdentity: {
          tenantId: tenant.id,
          guestToken,
          customerId: null,
        },
      },
      parsed.data,
    );

    revalidatePath(`/${tenantSlug}/cart`);
    revalidatePath(`/${tenantSlug}`, "layout");
    redirect(`/${tenantSlug}/orders/${order.orderNumber}/confirmation`);
  } catch (error) {
    if (isNextRedirect(error)) {
      throw error;
    }
    if (isAppError(error)) {
      return { error: error.message };
    }
    throw error;
  }
}

export async function placeOrderFromJson(
  tenantSlug: string,
  body: unknown,
  guestToken: string | null,
) {
  const tenant = await getTenantBySlug(tenantSlug);
  const parsed = checkoutInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid checkout details");
  }

  return placeGuestOrder(
    {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      currency: tenant.currency,
      tenantConfig: tenant.config,
      cartIdentity: {
        tenantId: tenant.id,
        guestToken,
        customerId: null,
      },
    },
    parsed.data,
  );
}
