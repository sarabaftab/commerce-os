"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import {
  createProductForTenant,
  deleteProductForTenant,
  productFormSchema,
  productFormToCreateInput,
  productFormToUpdateInput,
  updateProductForTenant,
} from "@/modules/catalog";
import { catalogTag } from "@/modules/catalog/cache-tags";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

export type ActionState = {
  error?: string;
  fieldErrors?: Record<string, string[]>;
};

function formDataToObject(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    slug: String(formData.get("slug") ?? ""),
    description: String(formData.get("description") ?? ""),
    priceMajor: String(formData.get("priceMajor") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    categoryId: String(formData.get("categoryId") ?? ""),
    isAvailable: formData.get("isAvailable") === "on" || formData.get("isAvailable") === "true",
    stockNote: String(formData.get("stockNote") ?? ""),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    mediaUrl: String(formData.get("mediaUrl") ?? ""),
  };
}

function revalidateStorefrontCatalog(tenantId: string, tenantSlug: string) {
  revalidateTag(catalogTag(tenantId));
  revalidatePath(`/${tenantSlug}`);
  revalidatePath(`/${tenantSlug}/products`);
}

export async function createProductAction(
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdminSession();
  const parsed = productFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await createProductForTenant(productFormToCreateInput(parsed.data, session.tenantId));
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to create product",
    };
  }

  revalidatePath("/admin/products");
  revalidateStorefrontCatalog(session.tenantId, session.tenantSlug);
  redirect("/admin/products");
}

export async function updateProductAction(
  productId: string,
  _prev: ActionState,
  formData: FormData,
): Promise<ActionState> {
  const session = await requireAdminSession();
  const parsed = productFormSchema.safeParse(formDataToObject(formData));

  if (!parsed.success) {
    return {
      error: "Please fix the highlighted fields.",
      fieldErrors: parsed.error.flatten().fieldErrors as Record<string, string[]>,
    };
  }

  try {
    await updateProductForTenant(
      productFormToUpdateInput(parsed.data, session.tenantId, productId),
    );
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to update product",
    };
  }

  revalidatePath("/admin/products");
  revalidatePath(`/admin/products/${productId}/edit`);
  revalidateStorefrontCatalog(session.tenantId, session.tenantSlug);
  redirect("/admin/products");
}

export async function deleteProductAction(productId: string): Promise<ActionState> {
  const session = await requireAdminSession();

  try {
    await deleteProductForTenant(session.tenantId, productId);
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to delete product",
    };
  }

  revalidatePath("/admin/products");
  revalidateStorefrontCatalog(session.tenantId, session.tenantSlug);
  return {};
}
