import { z } from "zod";

import { toMinor } from "@/shared/money/money";

export const productFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(120),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  description: z.union([z.literal(""), z.string().trim().max(2000)]).optional(),
  brand: z.union([z.literal(""), z.string().trim().max(80)]).optional(),
  volume: z.union([z.literal(""), z.string().trim().max(40)]).optional(),
  sellingUnit: z.enum(["item", "pack", "case"]).default("item"),
  priceMajor: z.coerce.number().finite().nonnegative("Price must be zero or positive"),
  currency: z
    .string()
    .trim()
    .length(3)
    .transform((value) => value.toUpperCase()),
  categoryId: z.union([z.literal(""), z.string().min(1)]).optional(),
  isAvailable: z.boolean(),
  stockNote: z.union([z.literal(""), z.string().trim().max(240)]).optional(),
  sortOrder: z.coerce.number().int().default(0),
  mediaUrl: z.union([z.literal(""), z.string().trim().url("Media URL must be valid")]).optional(),
});

export type ProductFormValues = z.infer<typeof productFormSchema>;

export function productFormToCreateInput(
  values: ProductFormValues,
  tenantId: string,
) {
  return {
    tenantId,
    name: values.name,
    slug: values.slug,
    description: values.description || null,
    brand: values.brand || null,
    volume: values.volume || null,
    sellingUnit: values.sellingUnit,
    priceMinor: toMinor(values.priceMajor, values.currency),
    currency: values.currency,
    categoryId: values.categoryId || null,
    isAvailable: values.isAvailable,
    stockNote: values.stockNote || null,
    sortOrder: values.sortOrder,
    mediaUrl: values.mediaUrl || null,
  };
}

export function productFormToUpdateInput(
  values: ProductFormValues,
  tenantId: string,
  productId: string,
) {
  return {
    ...productFormToCreateInput(values, tenantId),
    productId,
  };
}
