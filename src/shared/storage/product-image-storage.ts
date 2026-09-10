import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env, publicEnv } from "@/shared/config/env";
import { AppError } from "@/shared/errors/app-error";
import { PRODUCT_IMAGE_MAX_BYTES } from "@/shared/storage/product-image-constants";

export {
  PRODUCT_IMAGE_ACCEPT,
  PRODUCT_IMAGE_MAX_BYTES,
  PRODUCT_IMAGE_REQUIREMENTS_LABEL,
} from "@/shared/storage/product-image-constants";

/** Public tenant assets bucket — same as ABA QR images. */
export const PRODUCT_IMAGE_BUCKET = "tenant-assets";

const MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type ProductImageMime = keyof typeof MIME_TO_EXT;

export function detectProductImageMime(bytes: Uint8Array): ProductImageMime | null {
  if (bytes.length < 12) {
    return null;
  }
  if (bytes[0] === 0x89 && bytes[1] === 0x50 && bytes[2] === 0x4e && bytes[3] === 0x47) {
    return "image/png";
  }
  if (bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff) {
    return "image/jpeg";
  }
  const riff = String.fromCharCode(bytes[0]!, bytes[1]!, bytes[2]!, bytes[3]!);
  const webp = String.fromCharCode(bytes[8]!, bytes[9]!, bytes[10]!, bytes[11]!);
  return riff === "RIFF" && webp === "WEBP" ? "image/webp" : null;
}

export function validateProductImageBytes(bytes: Uint8Array): {
  mime: ProductImageMime;
  ext: string;
} {
  if (bytes.byteLength === 0) {
    throw new AppError("VALIDATION", "Choose a product image to upload");
  }
  if (bytes.byteLength > PRODUCT_IMAGE_MAX_BYTES) {
    throw new AppError("VALIDATION", "Product image must be 5 MB or smaller");
  }
  const mime = detectProductImageMime(bytes);
  if (!mime) {
    throw new AppError("VALIDATION", "Upload a PNG, JPG, or WEBP product image");
  }
  return { mime, ext: MIME_TO_EXT[mime] };
}

export function buildProductImageObjectPath(tenantId: string, ext: string): string {
  const id = randomBytes(16).toString("hex");
  return `tenants/${tenantId}/products/${id}.${ext}`;
}

function serviceClient(): SupabaseClient {
  const key = env().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new AppError("INTERNAL", "Product image storage is not configured");
  }
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensurePublicBucket(supabase: SupabaseClient) {
  const { data } = await supabase.storage.getBucket(PRODUCT_IMAGE_BUCKET);
  if (data) {
    if (!data.public) {
      const { error } = await supabase.storage.updateBucket(PRODUCT_IMAGE_BUCKET, {
        public: true,
      });
      if (error) {
        throw new AppError("INTERNAL", "Could not configure product image storage");
      }
    }
    return;
  }
  const { error } = await supabase.storage.createBucket(PRODUCT_IMAGE_BUCKET, {
    public: true,
    fileSizeLimit: PRODUCT_IMAGE_MAX_BYTES,
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new AppError("INTERNAL", "Could not initialize product image storage");
  }
}

/**
 * Upload a product image for the authenticated tenant.
 * Returns a public HTTPS URL suitable for ProductMedia.url / Next Image.
 */
export async function uploadProductImageObject(input: {
  tenantId: string;
  bytes: Uint8Array;
}): Promise<{ url: string; path: string; contentType: ProductImageMime }> {
  const { mime, ext } = validateProductImageBytes(input.bytes);
  const path = buildProductImageObjectPath(input.tenantId, ext);
  if (!path.startsWith(`tenants/${input.tenantId}/products/`)) {
    throw new AppError("FORBIDDEN", "Invalid product image path");
  }

  const supabase = serviceClient();
  await ensurePublicBucket(supabase);

  const { error } = await supabase.storage.from(PRODUCT_IMAGE_BUCKET).upload(path, input.bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    throw new AppError("INTERNAL", "Could not store the product image");
  }

  const { data } = supabase.storage.from(PRODUCT_IMAGE_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new AppError("INTERNAL", "Could not create the product image URL");
  }
  return { url: data.publicUrl, path, contentType: mime };
}
