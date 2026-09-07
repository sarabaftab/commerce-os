"use server";

import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

import {
  broadcastFormDataToObject,
  broadcastInputSchema,
} from "../schemas/broadcast";
import { publishTelegramBroadcast } from "../services/broadcast-service";

export type PublishBroadcastActionState = {
  error?: string;
  success?: boolean;
  channel?: string;
};

export async function publishBroadcastAction(
  _prev: PublishBroadcastActionState,
  formData: FormData,
): Promise<PublishBroadcastActionState> {
  const session = await requireAdminSession();
  const parsed = broadcastInputSchema.safeParse(broadcastFormDataToObject(formData));
  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? "Invalid broadcast" };
  }

  try {
    const result = await publishTelegramBroadcast({
      tenantId: session.tenantId,
      tenantSlug: session.tenantSlug,
      adminUserId: session.userId,
      data: parsed.data,
    });
    return { success: true, channel: result.channel };
  } catch (error) {
    return {
      error: isAppError(error)
        ? error.message
        : "Unable to publish the broadcast. Please try again.",
    };
  }
}
