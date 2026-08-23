import { randomBytes } from "node:crypto";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";

import { env, publicEnv } from "@/shared/config/env";
import { AppError } from "@/shared/errors/app-error";

export const PAYMENT_PROOF_BUCKET = "payment-proofs";
export const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PAYMENT_PROOF_SIGNED_URL_SECONDS = 120;

const MIME_TO_EXT = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
} as const;

export type PaymentProofMime = keyof typeof MIME_TO_EXT;

export function detectPaymentProofMime(bytes: Uint8Array): PaymentProofMime | null {
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
  if (riff === "RIFF" && webp === "WEBP") {
    return "image/webp";
  }
  return null;
}

export function validatePaymentProofBytes(bytes: Uint8Array): {
  mime: PaymentProofMime;
  ext: string;
} {
  if (bytes.byteLength === 0) {
    throw new AppError("VALIDATION", "Choose a transfer screenshot to upload");
  }
  if (bytes.byteLength > PAYMENT_PROOF_MAX_BYTES) {
    throw new AppError("VALIDATION", "Image must be 5 MB or smaller");
  }
  const mime = detectPaymentProofMime(bytes);
  if (!mime) {
    throw new AppError("VALIDATION", "Upload a PNG, JPG, or WEBP screenshot");
  }
  return { mime, ext: MIME_TO_EXT[mime] };
}

export function buildPaymentProofObjectPath(
  tenantId: string,
  orderId: string,
  ext: string,
): string {
  const id = randomBytes(16).toString("hex");
  return `${tenantId}/${orderId}/${id}.${ext}`;
}

function serviceClient(): SupabaseClient {
  const key = env().SUPABASE_SERVICE_ROLE_KEY;
  if (!key) {
    throw new AppError("INTERNAL", "Payment proof storage is not configured");
  }
  return createClient(publicEnv().NEXT_PUBLIC_SUPABASE_URL, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function uploadPaymentProofObject(input: {
  tenantId: string;
  orderId: string;
  bytes: Uint8Array;
}): Promise<{ path: string; contentType: PaymentProofMime }> {
  const { mime, ext } = validatePaymentProofBytes(input.bytes);
  const path = buildPaymentProofObjectPath(input.tenantId, input.orderId, ext);
  const supabase = serviceClient();
  const { error } = await supabase.storage.from(PAYMENT_PROOF_BUCKET).upload(path, input.bytes, {
    contentType: mime,
    upsert: false,
  });
  if (error) {
    throw new AppError("INTERNAL", "Could not store the transfer screenshot");
  }
  return { path, contentType: mime };
}

export async function createPaymentProofSignedUrl(path: string): Promise<string> {
  const supabase = serviceClient();
  const { data, error } = await supabase.storage
    .from(PAYMENT_PROOF_BUCKET)
    .createSignedUrl(path, PAYMENT_PROOF_SIGNED_URL_SECONDS);
  if (error || !data?.signedUrl) {
    throw new AppError("INTERNAL", "Could not open the transfer screenshot");
  }
  return data.signedUrl;
}
