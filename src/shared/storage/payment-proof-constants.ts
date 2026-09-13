/** Client-safe payment-proof upload limits (no Node builtins). */
export const PAYMENT_PROOF_MAX_BYTES = 5 * 1024 * 1024;
export const PAYMENT_PROOF_MAX_MB = 5;
export const PAYMENT_PROOF_ACCEPT = "image/png,image/jpeg,image/webp";
export const PAYMENT_PROOF_REQUIREMENTS_LABEL =
  "Accepted files: JPG, PNG, or WEBP · Maximum 5 MB";
