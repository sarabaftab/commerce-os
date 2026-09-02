"use server";

import { revalidatePath } from "next/cache";

import { getOptionalCustomerSession } from "@/modules/customers";
import { getTenantBySlug } from "@/modules/identity";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";
import { readOrderConfirmationCookie } from "@/shared/orders/confirmation-cookie";
import { PAYMENT_PROOF_MAX_BYTES } from "@/shared/storage/payment-proof-storage";

import {
  rejectOrderPaymentProof,
  submitCustomerPaymentProof,
  verifyOrderPaymentProof,
} from "../services/payment-proof-service";

export type PaymentProofActionState = {
  error?: string;
  success?: boolean;
};

async function fileToBytes(file: File): Promise<Uint8Array> {
  if (file.size > PAYMENT_PROOF_MAX_BYTES) {
    throw new Error("Image must be 5 MB or smaller");
  }
  return new Uint8Array(await file.arrayBuffer());
}

export async function uploadPaymentProofAction(
  tenantSlug: string,
  orderNumber: string,
  _prev: PaymentProofActionState,
  formData: FormData,
): Promise<PaymentProofActionState> {
  const tenant = await getTenantBySlug(tenantSlug);
  const file = formData.get("proof");
  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a transfer screenshot to upload" };
  }

  try {
    const [session, confirmCookie] = await Promise.all([
      getOptionalCustomerSession(tenant.id),
      readOrderConfirmationCookie(),
    ]);
    const confirmationToken =
      confirmCookie?.orderNumber === orderNumber ? confirmCookie.token : null;

    await submitCustomerPaymentProof({
      tenantId: tenant.id,
      orderNumber,
      confirmationToken,
      customerId: session?.customerId ?? null,
      bytes: await fileToBytes(file),
    });
  } catch (error) {
    if (error instanceof Error && error.message.includes("5 MB")) {
      return { error: error.message };
    }
    return {
      error: isAppError(error) ? error.message : "Could not upload the screenshot",
    };
  }

  revalidatePath(`/${tenantSlug}/orders/${orderNumber}/confirmation`);
  revalidatePath(`/${tenantSlug}/account/orders/${orderNumber}`);
  return { success: true };
}

export async function verifyPaymentProofAction(
  _prev: PaymentProofActionState,
  formData: FormData,
): Promise<PaymentProofActionState> {
  const session = await requireAdminSession();
  const orderId = String(formData.get("orderId") ?? "");
  if (!orderId) {
    return { error: "Order is required" };
  }
  try {
    await verifyOrderPaymentProof({ tenantId: session.tenantId, orderId });
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Could not verify payment",
    };
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}

export async function rejectPaymentProofAction(
  _prev: PaymentProofActionState,
  formData: FormData,
): Promise<PaymentProofActionState> {
  const session = await requireAdminSession();
  const orderId = String(formData.get("orderId") ?? "");
  const reason = String(formData.get("reason") ?? "");
  if (!orderId) {
    return { error: "Order is required" };
  }
  try {
    await rejectOrderPaymentProof({
      tenantId: session.tenantId,
      orderId,
      reason,
    });
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Could not reject the screenshot",
    };
  }
  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${orderId}`);
  return { success: true };
}
