"use server";

import { revalidatePath } from "next/cache";

import { getTenantBySlug } from "@/modules/identity";
import { requireCustomerSession } from "@/modules/customers/services/customer-auth";
import { isAppError } from "@/shared/errors/app-error";
import { getRequestLocale } from "@/shared/i18n/get-request-locale";
import { t } from "@/shared/i18n/messages";

import {
  feedbackFormDataToObject,
  normalizeFeedbackInput,
  submitOrderFeedbackSchema,
} from "../schemas/feedback";
import { submitOrderFeedback } from "../services/order-feedback-service";

export type FeedbackActionState = {
  error?: string;
  fieldErrors?: Record<string, string>;
  success?: string;
};

function zodFieldErrors(error: {
  issues: { path: PropertyKey[]; message: string }[];
}) {
  const fieldErrors: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = String(issue.path[0] ?? "form");
    if (!fieldErrors[key]) {
      fieldErrors[key] = issue.message;
    }
  }
  return fieldErrors;
}

export async function submitOrderFeedbackAction(
  tenantSlug: string,
  _prev: FeedbackActionState,
  formData: FormData,
): Promise<FeedbackActionState> {
  const locale = await getRequestLocale();
  try {
    const tenant = await getTenantBySlug(tenantSlug);
    const session = await requireCustomerSession(tenant.id);
    const parsed = submitOrderFeedbackSchema.safeParse(feedbackFormDataToObject(formData));
    if (!parsed.success) {
      return {
        error: t(locale, "feedbackFixFields"),
        fieldErrors: zodFieldErrors(parsed.error),
      };
    }

    const data = normalizeFeedbackInput(parsed.data);
    await submitOrderFeedback({
      tenantId: session.tenantId,
      customerId: session.customerId,
      data,
    });

    revalidatePath(`/${tenantSlug}/account/orders/${data.orderNumber}`);
    revalidatePath(`/${tenantSlug}/account/orders`);
    return { success: t(locale, "feedbackThanks") };
  } catch (error) {
    if (isAppError(error)) {
      return { error: error.message };
    }
    throw error;
  }
}
