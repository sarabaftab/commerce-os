import { z } from "zod";

import { isValidPhone, normalizePhone } from "@/shared/phone/normalize-phone";

import { paymentMethodSchema } from "./order-status";

export const fulfillmentMethodSchema = z.enum(["delivery", "pickup"]);

export const checkoutInputSchema = z
  .object({
    idempotencyKey: z.string().uuid(),
    displayName: z.string().trim().min(1, "Name is required").max(120),
    phone: z
      .string()
      .trim()
      .min(1, "Phone is required")
      .refine(isValidPhone, "Enter a valid phone number"),
    email: z
      .string()
      .trim()
      .email("Enter a valid email")
      .max(254)
      .optional()
      .or(z.literal("")),
    fulfillmentMethod: fulfillmentMethodSchema,
    addressLine: z.string().trim().max(200).optional().or(z.literal("")),
    cityOrArea: z.string().trim().max(120).optional().or(z.literal("")),
    deliveryInstructions: z.string().trim().max(500).optional().or(z.literal("")),
    pickupLocationKey: z.string().trim().max(64).optional().or(z.literal("")),
    paymentMethod: paymentMethodSchema,
    paymentReference: z.string().trim().max(120).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (data.fulfillmentMethod === "delivery") {
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
    email: data.email?.trim() ? data.email.trim() : undefined,
    addressLine: data.addressLine?.trim() || undefined,
    cityOrArea: data.cityOrArea?.trim() || undefined,
    deliveryInstructions: data.deliveryInstructions?.trim() || undefined,
    pickupLocationKey: data.pickupLocationKey?.trim() || undefined,
    paymentReference: data.paymentReference?.trim() || undefined,
  }));

export type CheckoutInput = z.infer<typeof checkoutInputSchema>;

export function checkoutFormDataToObject(formData: FormData) {
  return {
    idempotencyKey: String(formData.get("idempotencyKey") ?? ""),
    displayName: String(formData.get("displayName") ?? ""),
    phone: String(formData.get("phone") ?? ""),
    email: String(formData.get("email") ?? ""),
    fulfillmentMethod: String(formData.get("fulfillmentMethod") ?? ""),
    addressLine: String(formData.get("addressLine") ?? ""),
    cityOrArea: String(formData.get("cityOrArea") ?? ""),
    deliveryInstructions: String(formData.get("deliveryInstructions") ?? ""),
    pickupLocationKey: String(formData.get("pickupLocationKey") ?? ""),
    paymentMethod: String(formData.get("paymentMethod") ?? ""),
    paymentReference: String(formData.get("paymentReference") ?? ""),
  };
}
