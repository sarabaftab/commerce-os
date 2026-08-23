import { z } from "zod";

import { PRODUCT_IMPORT_MAX_ROWS } from "./csv";

export const productImportPayloadItemSchema = z.object({
  name: z.string().trim().min(1).max(120),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(140)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  description: z.string().max(2000).nullable(),
  categoryId: z.string().min(1),
  brand: z.string().max(80).nullable(),
  volume: z.string().max(40).nullable(),
  sellingUnit: z.enum(["item", "pack", "case"]).default("item"),
  priceMinor: z.number().int().nonnegative(),
  isAvailable: z.boolean(),
});

export const productImportPayloadSchema = z
  .array(productImportPayloadItemSchema)
  .min(1)
  .max(PRODUCT_IMPORT_MAX_ROWS);

export type ProductImportPayloadItem = z.infer<typeof productImportPayloadItemSchema>;
