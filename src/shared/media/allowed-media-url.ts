/**
 * Allowed hosts for product / public media that Next.js may optimize (AUD-009).
 * Keep in sync with `images.remotePatterns` in next.config.ts.
 */
const ALLOWED_HOST_SUFFIXES = [".supabase.co", ".supabase.in"] as const;
const ALLOWED_EXACT_HOSTS = new Set(["localhost", "127.0.0.1"]);

export function isAllowedMediaHostname(hostname: string): boolean {
  const host = hostname.trim().toLowerCase();
  if (ALLOWED_EXACT_HOSTS.has(host)) {
    return true;
  }
  return ALLOWED_HOST_SUFFIXES.some(
    (suffix) => host === suffix.slice(1) || host.endsWith(suffix),
  );
}

/**
 * Stored product media URLs must be https on an allowed host.
 * Empty string is allowed (no image).
 */
export function isAllowedProductMediaUrl(value: string): boolean {
  const trimmed = value.trim();
  if (!trimmed) {
    return true;
  }
  try {
    const url = new URL(trimmed);
    if (url.protocol !== "https:") {
      return false;
    }
    return isAllowedMediaHostname(url.hostname);
  } catch {
    return false;
  }
}

/** Whether next/image should fetch/optimize this src. */
export function isOptimizableMediaSrc(src: string): boolean {
  if (src.startsWith("/")) {
    return true;
  }
  try {
    const url = new URL(src);
    if (url.protocol === "https:") {
      return isAllowedMediaHostname(url.hostname);
    }
    // Local next/image only — never optimize arbitrary http hosts.
    if (url.protocol === "http:") {
      return ALLOWED_EXACT_HOSTS.has(url.hostname.toLowerCase());
    }
    return false;
  } catch {
    return false;
  }
}
