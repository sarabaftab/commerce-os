"use server";

import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";
import {
  PRODUCT_IMAGE_MAX_BYTES,
  uploadProductImageObject,
} from "@/shared/storage/product-image-storage";

export type UploadProductImageState = {
  error?: string;
  url?: string;
};

/**
 * Authenticated admin upload for product images.
 * Tenant is resolved from the admin session only — never from client input.
 */
export async function uploadProductImageAction(
  _prev: UploadProductImageState,
  formData: FormData,
): Promise<UploadProductImageState> {
  const session = await requireAdminSession();
  const file = formData.get("productImage");

  if (!(file instanceof File) || file.size === 0) {
    return { error: "Choose a product image to upload" };
  }
  if (file.size > PRODUCT_IMAGE_MAX_BYTES) {
    return { error: "Product image must be 5 MB or smaller" };
  }

  try {
    const uploaded = await uploadProductImageObject({
      tenantId: session.tenantId,
      bytes: new Uint8Array(await file.arrayBuffer()),
    });
    return { url: uploaded.url };
  } catch (error) {
    return {
      error: isAppError(error)
        ? error.message
        : "Could not upload the product image. Please try again.",
    };
  }
}
