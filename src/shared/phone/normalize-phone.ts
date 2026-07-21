/** Strip non-digits for consistent phone lookup and storage. */
export function normalizePhone(phone: string): string {
  return phone.replace(/\D/g, "");
}

export function isValidPhone(phone: string): boolean {
  const normalized = normalizePhone(phone);
  return normalized.length >= 8 && normalized.length <= 15;
}
