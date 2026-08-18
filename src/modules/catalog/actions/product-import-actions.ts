"use server";

import { revalidatePath, revalidateTag } from "next/cache";
import { redirect } from "next/navigation";

import { catalogTag } from "@/modules/catalog/cache-tags";
import {
  importValidProductsForTenant,
  previewProductImport,
  type ProductImportPreview,
} from "@/modules/catalog/services/product-import-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

export type ProductImportPreviewState = {
  error?: string;
  preview?: ProductImportPreview;
};

export type ProductImportConfirmState = {
  error?: string;
};

async function readCsvFromForm(formData: FormData): Promise<string> {
  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) {
    throw new Error("Choose a CSV file to import");
  }
  if (!file.name.toLowerCase().endsWith(".csv") && file.type && !file.type.includes("csv")) {
    throw new Error("File must be a .csv");
  }
  return file.text();
}

export async function previewProductImportAction(
  _prev: ProductImportPreviewState,
  formData: FormData,
): Promise<ProductImportPreviewState> {
  const session = await requireAdminSession();
  try {
    const csvText = await readCsvFromForm(formData);
    const preview = await previewProductImport({
      tenantId: session.tenantId,
      currency: session.tenantCurrency,
      csvText,
    });
    return { preview };
  } catch (error) {
    return {
      error: isAppError(error)
        ? error.message
        : error instanceof Error
          ? error.message
          : "Could not preview CSV",
    };
  }
}

export async function confirmProductImportAction(
  _prev: ProductImportConfirmState,
  formData: FormData,
): Promise<ProductImportConfirmState> {
  const session = await requireAdminSession();
  const raw = String(formData.get("payload") ?? "");
  let items: unknown;
  try {
    items = JSON.parse(raw);
  } catch {
    return { error: "Import payload is invalid" };
  }

  try {
    await importValidProductsForTenant({
      tenantId: session.tenantId,
      currency: session.tenantCurrency,
      items,
    });
  } catch (error) {
    return {
      error: isAppError(error) ? error.message : "Failed to import products",
    };
  }

  revalidateTag(catalogTag(session.tenantId));
  revalidatePath(`/${session.tenantSlug}`);
  revalidatePath(`/${session.tenantSlug}/products`);
  revalidatePath("/admin/products");
  redirect("/admin/products");
}
