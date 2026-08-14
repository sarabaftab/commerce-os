/** Tenant-scoped Next.js data-cache tags for public catalog. */
export function catalogTag(tenantId: string) {
  return `catalog:${tenantId}`;
}

export function catalogCategoriesTag(tenantId: string) {
  return `catalog:${tenantId}:categories`;
}

export function catalogProductTag(tenantId: string, slug: string) {
  return `catalog:${tenantId}:product:${slug}`;
}

export const CATALOG_REVALIDATE_SECONDS = 60;
