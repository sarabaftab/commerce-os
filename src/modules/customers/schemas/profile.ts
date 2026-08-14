import { z } from "zod";

import { isValidPhone, normalizePhone } from "@/shared/phone/normalize-phone";

export function collapseSpaces(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export function normalizeEmail(value: string): string {
  return value.trim().toLowerCase();
}

export function emptyToUndefined(value: string | undefined | null): string | undefined {
  const trimmed = value?.trim();
  return trimmed ? trimmed : undefined;
}

const nameField = z
  .string()
  .trim()
  .min(1, "Required")
  .max(80)
  .transform(collapseSpaces);

export const phoneField = z
  .string()
  .trim()
  .min(1, "Phone is required")
  .refine(isValidPhone, "Enter a valid phone number")
  .transform(normalizePhone);

export const optionalEmailField = z
  .union([z.literal(""), z.string().trim().email("Enter a valid email").max(254)])
  .optional()
  .transform((value) => {
    if (!value || !value.trim()) return undefined;
    return normalizeEmail(value);
  });

export const countryCodeField = z
  .string()
  .trim()
  .length(2, "Use a 2-letter country code")
  .transform((value) => value.toUpperCase())
  .refine((value) => /^[A-Z]{2}$/.test(value), "Invalid country code");

export const customerProfileUpdateSchema = z
  .object({
    firstName: nameField,
    lastName: nameField,
    displayName: z
      .string()
      .trim()
      .max(120)
      .optional()
      .or(z.literal(""))
      .transform((value) => (value?.trim() ? collapseSpaces(value) : undefined)),
    phone: phoneField,
    email: optionalEmailField,
  })
  .transform((data) => ({
    ...data,
    displayName:
      data.displayName ??
      collapseSpaces(`${data.firstName} ${data.lastName}`),
  }));

export type CustomerProfileUpdateInput = z.infer<typeof customerProfileUpdateSchema>;

export const ADDRESS_LABEL_SUGGESTIONS = ["Home", "Office", "Parents", "Other"] as const;

export const customerAddressInputSchema = z.object({
  label: z
    .string()
    .trim()
    .min(1, "Label is required")
    .max(40)
    .transform(collapseSpaces),
  recipientFirstName: nameField,
  recipientLastName: nameField,
  phone: phoneField,
  addressLine1: z.string().trim().min(1, "Address is required").max(200).transform(collapseSpaces),
  addressLine2: z
    .string()
    .trim()
    .max(200)
    .optional()
    .or(z.literal(""))
    .transform((v) => emptyToUndefined(v)),
  cityOrDistrict: z.string().trim().min(1, "City or district is required").max(120).transform(collapseSpaces),
  provinceOrState: z.string().trim().min(1, "Province or state is required").max(120).transform(collapseSpaces),
  postalCode: z
    .string()
    .trim()
    .max(20)
    .optional()
    .or(z.literal(""))
    .transform((v) => emptyToUndefined(v)),
  countryCode: countryCodeField.default("KH"),
  deliveryInstructions: z
    .string()
    .trim()
    .max(500)
    .optional()
    .or(z.literal(""))
    .transform((v) => emptyToUndefined(v)),
  isDefault: z.boolean().optional().default(false),
});

export type CustomerAddressInput = z.infer<typeof customerAddressInputSchema>;

export function profileFormDataToObject(formData: FormData) {
  return {
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
  };
}

export function addressFormDataToObject(formData: FormData) {
  return {
    label: String(formData.get("label") ?? ""),
    recipientFirstName: String(formData.get("recipientFirstName") ?? ""),
    recipientLastName: String(formData.get("recipientLastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    addressLine1: String(formData.get("addressLine1") ?? ""),
    addressLine2: String(formData.get("addressLine2") ?? ""),
    cityOrDistrict: String(formData.get("cityOrDistrict") ?? ""),
    provinceOrState: String(formData.get("provinceOrState") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    countryCode: String(formData.get("countryCode") ?? "KH"),
    deliveryInstructions: String(formData.get("deliveryInstructions") ?? ""),
    isDefault: formData.get("isDefault") === "on" || formData.get("isDefault") === "true",
  };
}
