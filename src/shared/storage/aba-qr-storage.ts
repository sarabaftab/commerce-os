import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env, publicEnv } from "@/shared/config/env";
import { AppError } from "@/shared/errors/app-error";

export const ABA_QR_BUCKET = "tenant-assets";
export const ABA_QR_MAX_BYTES = 5 * 1024 * 1024;

const MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type AbaQrMime = keyof typeof MIME_TO_EXT;

export function detectAbaQrMime(bytes: Uint8Array): AbaQrMime | null {
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

function serviceClient(): SupabaseClient {
  const key = env().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new AppError("INTERNAL", "Storage is not configured");
  }
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

async function ensurePublicBucket(supabase: SupabaseClient) {
  const { data } = await supabase.storage.getBucket(ABA_QR_BUCKET);
  if (data) {
    if (!data.public) {
      const { error } = await supabase.storage.updateBucket(ABA_QR_BUCKET, {
        public: true,
      });
      if (error) {
        throw new AppError("INTERNAL", "Could not configure QR image storage");
      }
    }
    return;
  }
  const { error } = await supabase.storage.createBucket(ABA_QR_BUCKET, {
    public: true,
    fileSizeLimit: ABA_QR_MAX_BYTES,
  });
  if (error && !/already exists/i.test(error.message)) {
    throw new AppError("INTERNAL", "Could not initialize QR image storage");
  }
}

export function validateAbaQrBytes(bytes: Uint8Array): { mime: AbaQrMime; ext: string } {
  if (bytes.byteLength === 0) {
    throw new AppError("VALIDATION", "Choose an ABA QR image to upload");
  }
  if (bytes.byteLength > ABA_QR_MAX_BYTES) {
    throw new AppError("VALIDATION", "ABA QR image must be 5 MB or smaller");
  }
  const mime = detectAbaQrMime(bytes);
  if (!mime) {
    throw new AppError("VALIDATION", "Upload a PNG, JPG, or WEBP ABA QR image");
  }
  return { mime, ext: MIME_TO_EXT[mime] };
}

function buildAbaQrPath(tenantId: string, ext: string) {
  return `tenants/${tenantId}/aba-qr/${randomBytes(16).toString("hex")}.${ext}`;
}

export async function uploadAbaQrObject(input: {
  tenantId: string;
  bytes: Uint8Array;
}): Promise<{ url: string; path: string; contentType: AbaQrMime }> {
  const { mime, ext } = validateAbaQrBytes(input.bytes);
  const path = buildAbaQrPath(input.tenantId, ext);
  const supabase = serviceClient();
  await ensurePublicBucket(supabase);

  const { error } = await supabase.storage.from(ABA_QR_BUCKET).upload(path, input.bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    throw new AppError("INTERNAL", "Could not store the ABA QR image");
  }

  const { data } = supabase.storage.from(ABA_QR_BUCKET).getPublicUrl(path);
  if (!data.publicUrl) {
    throw new AppError("INTERNAL", "Could not create the ABA QR image URL");
  }
  return { url: data.publicUrl, path, contentType: mime };
}

/**
 * Only delete paths created by this helper. External/legacy URLs are retained.
 */
export async function removeAbaQrObjectByUrl(url: string | null | undefined): Promise<void> {
  if (!url) {
    return;
  }
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return;
  }
  const marker = `/storage/v1/object/public/${ABA_QR_BUCKET}/`;
  const markerIndex = parsed.pathname.indexOf(marker);
  if (markerIndex < 0) {
    return;
  }
  const path = decodeURIComponent(parsed.pathname.slice(markerIndex + marker.length));
  if (!path.startsWith("tenants/") || !path.includes("/aba-qr/")) {
    return;
  }
  const { error } = await serviceClient().storage.from(ABA_QR_BUCKET).remove([path]);
  if (error) {
    // Removing an old QR must not prevent saving a new settings value.
    console.warn("[aba-qr] old image cleanup failed");
  }
}
