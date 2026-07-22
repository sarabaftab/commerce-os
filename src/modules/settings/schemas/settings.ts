import { z } from "zod";

export const currencyCodeSchema = z
  .string()
  .trim()
  .length(3)
  .regex(/^[A-Za-z]{3}$/, "Currency must be a 3-letter code")
  .transform((v) => v.toUpperCase());

export const optionalHttpsUrlSchema = z
  .string()
  .trim()
  .max(2048)
  .optional()
  .or(z.literal(""))
  .refine(
    (v) => !v || /^https?:\/\//i.test(v),
    "URL must start with http:// or https://",
  );

export const optionalHexColorSchema = z
  .string()
  .trim()
  .optional()
  .or(z.literal(""))
  .refine((v) => !v || /^#[0-9A-Fa-f]{6}$/.test(v), "Color must be #RRGGBB");

const emptyToUndefined = (v: string | undefined) => {
  const t = v?.trim();
  return t ? t : undefined;
};

export const generalSettingsSchema = z.object({
  displayName: z.string().trim().max(120).optional().or(z.literal("")),
  phone: z.string().trim().max(40).optional().or(z.literal("")),
  email: z
    .string()
    .trim()
    .email("Enter a valid email")
    .max(254)
    .optional()
    .or(z.literal("")),
  address: z.string().trim().max(500).optional().or(z.literal("")),
  timezone: z.string().trim().min(1).max(64),
  businessHours: z.string().trim().max(1000).optional().or(z.literal("")),
  currency: currencyCodeSchema,
});

export const deliverySettingsSchema = z.object({
  deliveryEnabled: z.boolean(),
  deliveryFeeMinor: z.coerce.number().int().nonnegative(),
  freeDeliveryThresholdMinor: z
    .union([z.coerce.number().int().positive(), z.literal(""), z.nan()])
    .optional()
    .transform((v) => {
      if (v === "" || v === undefined || (typeof v === "number" && Number.isNaN(v))) {
        return null;
      }
      return v as number;
    }),
  deliveryNotes: z.string().trim().max(1000).optional().or(z.literal("")),
  pickupEnabled: z.boolean(),
});

export const paymentSettingsSchema = z
  .object({
    codEnabled: z.boolean(),
    abaEnabled: z.boolean(),
    abaAccountName: z.string().trim().max(120).optional().or(z.literal("")),
    abaAccountNumber: z.string().trim().max(64).optional().or(z.literal("")),
    abaInstructions: z.string().trim().max(2000).optional().or(z.literal("")),
    abaQrImageUrl: optionalHttpsUrlSchema,
    abaCustomerNote: z.string().trim().max(1000).optional().or(z.literal("")),
  })
  .superRefine((data, ctx) => {
    if (!data.abaEnabled) {
      return;
    }
    if (!data.abaAccountName?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "ABA account name is required when ABA is enabled",
        path: ["abaAccountName"],
      });
    }
    if (!data.abaAccountNumber?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "ABA account number is required when ABA is enabled",
        path: ["abaAccountNumber"],
      });
    }
    if (!data.abaInstructions?.trim()) {
      ctx.addIssue({
        code: "custom",
        message: "ABA payment instructions are required when ABA is enabled",
        path: ["abaInstructions"],
      });
    }
  });

export const brandingSettingsSchema = z.object({
  displayName: z.string().trim().max(120).optional().or(z.literal("")),
  logoUrl: optionalHttpsUrlSchema,
  primaryColor: optionalHexColorSchema,
});

export const pickupLocationInputSchema = z.object({
  id: z.string().min(1).optional(),
  name: z.string().trim().min(1).max(120),
  address: z.string().trim().min(1).max(300),
  instructions: z.string().trim().max(500).optional().or(z.literal("")),
  isActive: z.boolean(),
  sortOrder: z.coerce.number().int().min(0).max(9999),
});

export type GeneralSettingsInput = z.infer<typeof generalSettingsSchema>;
export type DeliverySettingsInput = z.infer<typeof deliverySettingsSchema>;
export type PaymentSettingsInput = z.infer<typeof paymentSettingsSchema>;
export type BrandingSettingsInput = z.infer<typeof brandingSettingsSchema>;
export type PickupLocationInput = z.infer<typeof pickupLocationInputSchema>;

export function normalizeOptionalString(value: string | undefined | null) {
  return emptyToUndefined(value ?? undefined) ?? null;
}
