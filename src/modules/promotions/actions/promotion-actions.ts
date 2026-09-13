"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

import {
  promotionFormDataToObject,
  promotionFormSchema,
  promotionFormToCreateInput,
  promotionFormToUpdateInput,
} from "../schemas/promotion";
import {
  createPromotionForTenant,
  updatePromotionForTenant,
} from "../services/promotion-service";

export type PromotionActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

export async function createPromotionAction(
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const session = await requireAdminSession();
  const parsed = promotionFormSchema.safeParse(promotionFormDataToObject(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await createPromotionForTenant(
      promotionFormToCreateInput(parsed.data, session.tenantId, session.tenantCurrency),
    );
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to create promotion",
    };
  }

  revalidatePath("/admin/promotions");
  revalidatePath(`/${session.tenantSlug}`);
  redirect("/admin/promotions?saved=1");
}

export async function updatePromotionAction(
  promotionId: string,
  _prev: PromotionActionState,
  formData: FormData,
): Promise<PromotionActionState> {
  const session = await requireAdminSession();
  const parsed = promotionFormSchema.safeParse(promotionFormDataToObject(formData));
  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await updatePromotionForTenant(
      promotionFormToUpdateInput(
        parsed.data,
        session.tenantId,
        promotionId,
        session.tenantCurrency,
      ),
    );
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to update promotion",
    };
  }

  revalidatePath("/admin/promotions");
  revalidatePath(`/admin/promotions/${promotionId}/edit`);
  revalidatePath(`/${session.tenantSlug}`);
  redirect("/admin/promotions?saved=1");
}
