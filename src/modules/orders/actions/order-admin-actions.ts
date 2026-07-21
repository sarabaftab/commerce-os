"use server";

import { revalidatePath } from "next/cache";

import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

import { updateOrderStatusSchema } from "../schemas/order-admin";
import { transitionOrderStatus } from "../services/order-status-service";

export type OrderStatusActionState = {
  error?: string;
  success?: boolean;
};

export async function updateOrderStatusAction(
  _prev: OrderStatusActionState,
  formData: FormData,
): Promise<OrderStatusActionState> {
  const session = await requireAdminSession();

  const parsed = updateOrderStatusSchema.safeParse({
    orderId: String(formData.get("orderId") ?? ""),
    toStatus: String(formData.get("toStatus") ?? ""),
    note: String(formData.get("note") ?? ""),
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid status update" };
  }

  try {
    await transitionOrderStatus({
      tenantId: session.tenantId,
      orderId: parsed.data.orderId,
      toStatus: parsed.data.toStatus,
      note: parsed.data.note || undefined,
      createdBy: session.userId,
    });
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to update order status",
    };
  }

  revalidatePath("/admin/orders");
  revalidatePath(`/admin/orders/${parsed.data.orderId}`);
  return { success: true };
}
