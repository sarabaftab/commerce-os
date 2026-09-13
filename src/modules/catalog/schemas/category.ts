import { z } from "zod";

export function slugifyCategoryName(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 100);
}

export const categoryFormSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(80),
  nameKm: z.union([z.literal(""), z.string().trim().max(80)]).optional(),
  nameZh: z.union([z.literal(""), z.string().trim().max(80)]).optional(),
  slug: z
    .string()
    .trim()
    .min(1, "Slug is required")
    .max(100)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be lowercase kebab-case"),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

export type CategoryFormValues = z.infer<typeof categoryFormSchema>;

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

export function categoryFormToCreateInput(values: CategoryFormValues, tenantId: string) {
  return {
    tenantId,
    name: values.name,
    nameKm: emptyToNull(values.nameKm),
    nameZh: emptyToNull(values.nameZh),
    slug: values.slug,
    sortOrder: values.sortOrder,
    isActive: values.isActive,
  };
}

export function categoryFormToUpdateInput(
  values: CategoryFormValues,
  tenantId: string,
  categoryId: string,
) {
  return {
    ...categoryFormToCreateInput(values, tenantId),
    categoryId,
  };
}

export function categoryFormDataToObject(formData: FormData) {
  const name = String(formData.get("name") ?? "");
  const slugRaw = String(formData.get("slug") ?? "").trim();
  return {
    name,
    nameKm: String(formData.get("nameKm") ?? ""),
    nameZh: String(formData.get("nameZh") ?? ""),
    slug: slugRaw || slugifyCategoryName(name),
    sortOrder: String(formData.get("sortOrder") ?? "0"),
    isActive: formData.get("isActive") === "on" || formData.get("isActive") === "true",
  };
}
