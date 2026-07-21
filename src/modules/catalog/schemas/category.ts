import { z } from "zod";

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1).max(80),
  slug: z
    .string()
    .trim()
    .min(1)
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.coerce.boolean().default(true),
});
