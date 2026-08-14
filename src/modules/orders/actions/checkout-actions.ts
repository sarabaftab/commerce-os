"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import {
  readAttributionFromCookies,
  readAttributionFromRequest,
  readCustomerSessionFromCookies,
  readCustomerSessionFromRequest,
} from "@/channels/telegram/server/customer-session";
import { findCustomerById } from "@/modules/customers/repositories/customer-repository";
import { getTenantBySlug } from "@/modules/identity";
import { readGuestTokenFromCookies, readGuestTokenFromRequest } from "@/shared/cart/cart-cookie";
import { AppError, isAppError } from "@/shared/errors/app-error";
import { setOrderConfirmationCookie } from "@/shared/orders/confirmation-cookie";

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

async function resolveCheckoutContext(tenantSlug: string) {
  const tenant = await getTenantBySlug(tenantSlug);
  const [guestToken, session, referralCode] = await Promise.all([
    readGuestTokenFromCookies(),
    readCustomerSessionFromCookies(tenant.id),
    readAttributionFromCookies(),
  ]);

  let customerDisplayName: string | null = null;
  let customerFirstName: string | null = null;
  let customerLastName: string | null = null;
  let customerPhone: string | null = null;
  let customerEmail: string | null = null;
  if (session?.customerId) {
    const customer = await findCustomerById(tenant.id, session.customerId);
    customerDisplayName = customer?.displayName ?? null;
    customerFirstName = customer?.firstName ?? null;
    customerLastName = customer?.lastName ?? null;
    customerPhone = customer?.phone ?? null;
    customerEmail = customer?.email ?? null;
  }

  return {
    tenant,
    cartIdentity: {
      tenantId: tenant.id,
      guestToken,
      customerId: session?.customerId ?? null,
    },
    channel: session?.channel ?? ("web" as const),
    referralCode,
    customerDisplayName,
    customerFirstName,
    customerLastName,
    customerPhone,
    customerEmail,
  };
}

export async function placeOrderAction(
  tenantSlug: string,
  _prevState: PlaceOrderActionState,
  formData: FormData,
): Promise<PlaceOrderActionState> {
  const ctx = await resolveCheckoutContext(tenantSlug);

  const parsed = checkoutInputSchema.safeParse(checkoutFormDataToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid checkout details" };
  }

  try {
    const order = await placeGuestOrder(
      {
        tenantId: ctx.tenant.id,
        tenantSlug: ctx.tenant.slug,
        currency: ctx.tenant.currency,
        cartIdentity: ctx.cartIdentity,
        channel: ctx.channel,
        referralCode: ctx.referralCode,
        customerDisplayName: ctx.customerDisplayName,
        customerFirstName: ctx.customerFirstName,
        customerLastName: ctx.customerLastName,
        customerPhone: ctx.customerPhone,
        customerEmail: ctx.customerEmail,
      },
      parsed.data,
    );

    revalidatePath(`/${tenantSlug}/cart`);
    revalidatePath(`/${tenantSlug}`, "layout");
    revalidatePath(`/${tenantSlug}/account/orders`);
    if (order.confirmationToken) {
      await setOrderConfirmationCookie(order.orderNumber, order.confirmationToken);
    }
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
  request: Request,
) {
  const tenant = await getTenantBySlug(tenantSlug);
  const parsed = checkoutInputSchema.safeParse(body);
  if (!parsed.success) {
    throw new AppError("VALIDATION", parsed.error.issues[0]?.message ?? "Invalid checkout details");
  }

  const guestToken = readGuestTokenFromRequest(request);
  const session = await readCustomerSessionFromRequest(tenant.id, request);
  const referralCode = readAttributionFromRequest(request);

  return placeGuestOrder(
    {
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      currency: tenant.currency,
      cartIdentity: {
        tenantId: tenant.id,
        guestToken,
        customerId: session?.customerId ?? null,
      },
      channel: session?.channel ?? "web",
      referralCode,
    },
    parsed.data,
  );
}
