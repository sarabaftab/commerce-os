import { z } from "zod";

import { isValidPhone, normalizePhone } from "@/shared/phone/normalize-phone";

import { paymentMethodSchema } from "./order-status";

export const fulfillmentMethodSchema = z.enum(["delivery", "pickup"]);

export const checkoutInputSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    displayName: z.string().trim().min(1, "Name is required").max(120),
    firstName: z.string().trim().max(80).optional().or(z.literal("")),
    lastName: z.string().trim().max(80).optional().or(z.literal("")),
    phone: z
      .string()
      .trim()
      .min(1, "Phone is required")
      .refine((value) => isValidPhone(value), "Enter a valid phone number"),
    email: z
      .string()
      .trim()
      .email("Enter a valid email")
      .max(254)
      .optional()
      .or(z.literal("")),
    fulfillmentMethod: fulfillmentMethodSchema,
    savedAddressId: z.string().trim().max(64).optional().or(z.literal("")),
    addressMode: z.enum(["saved", "new"]).optional().default("new"),
    addressLine: z.string().trim().max(200).optional().or(z.literal("")),
    addressLine2: z.string().trim().max(200).optional().or(z.literal("")),
    cityOrArea: z.string().trim().max(120).optional().or(z.literal("")),
    provinceOrState: z.string().trim().max(120).optional().or(z.literal("")),
    postalCode: z.string().trim().max(20).optional().or(z.literal("")),
    countryCode: z.string().trim().max(2).optional().or(z.literal("")),
    addressLabel: z.string().trim().max(40).optional().or(z.literal("")),
    deliveryInstructions: z.string().trim().max(500).optional().or(z.literal("")),
    saveAddress: z.boolean().optional().default(false),
    setAddressAsDefault: z.boolean().optional().default(false),
    pickupLocationKey: z.string().trim().max(64).optional().or(z.literal("")),
    paymentMethod: paymentMethodSchema,
    paymentReference: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentMethod === "delivery") {
      const usingSaved =
        data.addressMode === "saved" && Boolean(data.savedAddressId?.trim());
      if (!usingSaved) {
        if (!data.addressLine?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "Address is required for delivery",
            path: ["addressLine"],
          });
        }
        if (!data.cityOrArea?.trim()) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            message: "City or area is required for delivery",
            path: ["cityOrArea"],
          });
        }
      }
    }

    if (data.fulfillmentMethod === "pickup" && !data.pickupLocationKey?.trim()) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "Select a pickup location",
        path: ["pickupLocationKey"],
      });
    }
  })
  .transform((data) => ({
    ...data,
    phone: normalizePhone(data.phone),
    email: data.email?.trim() ? data.email.trim().toLowerCase() : undefined,
    firstName: data.firstName?.trim() || undefined,
    lastName: data.lastName?.trim() || undefined,
    savedAddressId: data.savedAddressId?.trim() || undefined,
    addressLine: data.addressLine?.trim() || undefined,
    addressLine2: data.addressLine2?.trim() || undefined,
    cityOrArea: data.cityOrArea?.trim() || undefined,
    provinceOrState: data.provinceOrState?.trim() || undefined,
    postalCode: data.postalCode?.trim() || undefined,
    countryCode: data.countryCode?.trim()?.toUpperCase() || undefined,
    addressLabel: data.addressLabel?.trim() || undefined,
    deliveryInstructions: data.deliveryInstructions?.trim() || undefined,
    pickupLocationKey: data.pickupLocationKey?.trim() || undefined,
    paymentReference: data.paymentReference?.trim() || undefined,
  }));

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export function checkoutFormDataToObject(formData: FormData) {
  return {
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    firstName: String(formData.get("firstName") ?? ""),
    lastName: String(formData.get("lastName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    fulfillmentMethod: String(formData.get("fulfillmentMethod") ?? ""),
    addressMode: String(formData.get("addressMode") ?? "new"),
    savedAddressId: String(formData.get("savedAddressId") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    addressLine2: String(formData.get("addressLine2") ?? ""),
    cityOrArea: String(formData.get("cityOrArea") ?? ""),
    provinceOrState: String(formData.get("provinceOrState") ?? ""),
    postalCode: String(formData.get("postalCode") ?? ""),
    countryCode: String(formData.get("countryCode") ?? ""),
    addressLabel: String(formData.get("addressLabel") ?? ""),
    deliveryInstructions: String(formData.get("deliveryInstructions") ?? ""),
    saveAddress:
      formData.get("saveAddress") === "on" || formData.get("saveAddress") === "true",
    setAddressAsDefault:
      formData.get("setAddressAsDefault") === "on" ||
      formData.get("setAddressAsDefault") === "true",
    pickupLocationKey: String(formData.get("pickupLocationKey") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    paymentReference: String(formData.get("paymentReference") ?? ""),
  };
}
