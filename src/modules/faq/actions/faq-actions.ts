"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  createFaqForTenant,
  deleteFaqForTenant,
  faqFormSchema,
  faqFormToCreateInput,
  faqFormToUpdateInput,
  faqRevalidationTargets,
  updateFaqForTenant,
} from "@/modules/faq";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

export type FaqActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function formDataToObject(formData: FormData) {
  return {
    question: String(formData.get("question") ?? ""),
    answer: String(formData.get("answer") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  };
}

function revalidateStorefrontFaqs(tenantId: string, tenantSlug: string) {
  const targets = faqRevalidationTargets(tenantId, tenantSlug);
  revalidateTag(targets.tag);
  for (const path of targets.paths) {
    revalidatePath(path);
  }
}

export async function createFaqAction(
  _prev: FaqActionState,
  formData: FormData,
): Promise<FaqActionState> {
  const session = await requireAdminSession();
  const parsed = faqFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await createFaqForTenant(faqFormToCreateInput(parsed.data, session.tenantId));
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to create FAQ",
    };
  }

  revalidatePath("/admin/faqs");
  revalidateStorefrontFaqs(session.tenantId, session.tenantSlug);
  redirect("/admin/faqs?saved=1");
}

export async function updateFaqAction(
  faqId: string,
  _prev: FaqActionState,
  formData: FormData,
): Promise<FaqActionState> {
  const session = await requireAdminSession();
  const parsed = faqFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await updateFaqForTenant(faqFormToUpdateInput(parsed.data, session.tenantId, faqId));
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to update FAQ",
    };
  }

  revalidatePath("/admin/faqs");
  revalidatePath(`/admin/faqs/${faqId}/edit`);
  revalidateStorefrontFaqs(session.tenantId, session.tenantSlug);
  redirect("/admin/faqs?saved=1");
}

export async function deleteFaqAction(faqId: string): Promise<FaqActionState> {
  const session = await requireAdminSession();

  try {
    await deleteFaqForTenant(session.tenantId, faqId);
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to delete FAQ",
    };
  }

  revalidatePath("/admin/faqs");
  revalidateStorefrontFaqs(session.tenantId, session.tenantSlug);
  return {};
}
