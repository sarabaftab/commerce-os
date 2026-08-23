/**
 * Only bounce back onto this tenant's Account routes after Telegram session POST.
 */
export function safeTelegramAccountPath(
  tenantSlug: string,
  nextPath: string | null | undefined,
): string {
  const fallback = `/${tenantSlug}/account`;
  if (!nextPath) {
    return fallback;
  }
  const trimmed = nextPath.trim();
  if (
    !trimmed.startsWith("/") ||
    trimmed.startsWith("//") ||
    trimmed.includes("\\") ||
    trimmed.includes("://")
  ) {
    return fallback;
  }
  const pathOnly = trimmed.split("?")[0] ?? fallback;
  if (!pathOnly.startsWith(`/${tenantSlug}/account`)) {
    return fallback;
  }
  return pathOnly;
}
