"use server";

import { revalidatePath } from "next/cache";

import { retryCustomerNotification } from "@/modules/notifications/services/notification-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

export type RetryNotificationActionState = {
  error?: string;
  success?: boolean;
};

export async function retryOrderNotificationAction(
  _prev: RetryNotificationActionState,
  formData: FormData,
): Promise<RetryNotificationActionState> {
  const session = await requireAdminSession();
  const notificationId = String(formData.get("notificationId") ?? "");
  const orderId = String(formData.get("orderId") ?? "");
  if (!notificationId) {
    return { error: "Notification is required" };
  }

  try {
    await retryCustomerNotification({
      tenantId: session.tenantId,
      notificationId,
    });
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Could not retry the notification",
    };
  }

  revalidatePath("/admin/orders");
  if (orderId) {
    revalidatePath(`/admin/orders/${orderId}`);
  }
  return { success: true };
}
