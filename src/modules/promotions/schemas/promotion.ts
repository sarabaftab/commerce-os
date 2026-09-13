import { z } from "zod";

import { toMinor } from "@/shared/money/money";

export const promotionFormSchema = z
  .object({
    name: z.string().trim().min(1, "Name is required").max(120),
    bannerText: z.union([z.literal(""), z.string().trim().max(280)]).optional(),
    type: z.enum(["percentage", "fixed"]),
    /** Percentage points or major currency units (converted for fixed). */
    valueMajor: z.coerce.number().finite().positive("Value must be greater than zero"),
    currency: z
      .string()
      .trim()
      .length(3)
      .transform((value) => value.toUpperCase())
      .optional(),
    minimumSubtotalMajor: z
      .union([z.literal(""), z.coerce.number().finite().nonnegative()])
      .optional(),
    startsAt: z.union([z.literal(""), z.string().trim()]).optional(),
    endsAt: z.union([z.literal(""), z.string().trim()]).optional(),
    isActive: z.boolean(),
  })
  .superRefine((data, ctx) => {
    if (data.type === "percentage") {
      if (data.valueMajor > 100) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Percentage cannot exceed 100",
          path: ["valueMajor"],
        });
      }
      if (!Number.isInteger(data.valueMajor)) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: "Percentage must be a whole number",
          path: ["valueMajor"],
        });
      }
    }

    const starts = parseOptionalDate(data.startsAt);
    const ends = parseOptionalDate(data.endsAt);
    if (starts && ends && ends <= starts) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: "End must be after start",
        path: ["endsAt"],
      });
    }
  });

export type PromotionFormValues = z.infer<typeof promotionFormSchema>;

function parseOptionalDate(value: string | undefined): Date | null {
  if (!value?.trim()) {
    return null;
  }
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

export function promotionFormToCreateInput(
  values: PromotionFormValues,
  tenantId: string,
  currency: string,
) {
  const value =
    values.type === "percentage"
      ? Math.round(values.valueMajor)
      : toMinor(values.valueMajor, currency);

  const minMajor =
    values.minimumSubtotalMajor === "" || values.minimumSubtotalMajor == null
      ? null
      : Number(values.minimumSubtotalMajor);

  return {
    tenantId,
    name: values.name,
    bannerText: emptyToNull(values.bannerText),
    type: values.type,
    value,
    minimumSubtotalMinor:
      minMajor == null ? null : toMinor(minMajor, currency),
    startsAt: parseOptionalDate(values.startsAt),
    endsAt: parseOptionalDate(values.endsAt),
    isActive: values.isActive,
  };
}

export function promotionFormToUpdateInput(
  values: PromotionFormValues,
  tenantId: string,
  promotionId: string,
  currency: string,
) {
  return {
    ...promotionFormToCreateInput(values, tenantId, currency),
    promotionId,
  };
}

export function promotionFormDataToObject(formData: FormData) {
  return {
    name: String(formData.get("name") ?? ""),
    bannerText: String(formData.get("bannerText") ?? ""),
    type: String(formData.get("type") ?? "percentage"),
    valueMajor: String(formData.get("valueMajor") ?? ""),
    currency: String(formData.get("currency") ?? ""),
    minimumSubtotalMajor: String(formData.get("minimumSubtotalMajor") ?? ""),
    startsAt: String(formData.get("startsAt") ?? ""),
    endsAt: String(formData.get("endsAt") ?? ""),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  };
}

/** datetime-local value from a Date (UTC→local for input display). */
export function toDatetimeLocalValue(date: Date | null | undefined): string {
  if (!date) {
    return "";
  }
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
