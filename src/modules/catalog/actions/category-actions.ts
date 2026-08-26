"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  categoryFormDataToObject,
  categoryFormSchema,
  categoryFormToCreateInput,
  categoryFormToUpdateInput,
} from "@/modules/catalog/schemas/category";
import {
  categoryRevalidationTargets,
  createCategoryForTenant,
  deleteCategoryForTenant,
  updateCategoryForTenant,
} from "@/modules/catalog/services/category-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

export type CategoryActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function revalidateCategorySurfaces(tenantId: string, tenantSlug: string) {
  const targets = categoryRevalidationTargets(tenantId, tenantSlug);
  for (const tag of targets.tags) {
    revalidateTag(tag);
  }
  for (const path of targets.paths) {
    revalidatePath(path);
  }
  revalidatePath("/admin/categories");
}

export async function createCategoryAction(
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const session = await requireAdminSession();
  const parsed = categoryFormSchema.safeParse(categoryFormDataToObject(formData));

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await createCategoryForTenant(categoryFormToCreateInput(parsed.data, session.tenantId));
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to create category",
    };
  }

  revalidateCategorySurfaces(session.tenantId, session.tenantSlug);
  redirect("/admin/categories?saved=1");
}

export async function updateCategoryAction(
  categoryId: string,
  _prev: CategoryActionState,
  formData: FormData,
): Promise<CategoryActionState> {
  const session = await requireAdminSession();
  const parsed = categoryFormSchema.safeParse(categoryFormDataToObject(formData));

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await updateCategoryForTenant(
      categoryFormToUpdateInput(parsed.data, session.tenantId, categoryId),
    );
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to update category",
    };
  }

  revalidatePath(`/admin/categories/${categoryId}/edit`);
  revalidateCategorySurfaces(session.tenantId, session.tenantSlug);
  redirect("/admin/categories?saved=1");
}

export async function deleteCategoryAction(categoryId: string): Promise<CategoryActionState> {
  const session = await requireAdminSession();

  try {
    await deleteCategoryForTenant(session.tenantId, categoryId);
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to delete category",
    };
  }

  revalidateCategorySurfaces(session.tenantId, session.tenantSlug);
  return {};
}
