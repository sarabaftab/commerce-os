import { cache } from "react";
import { unstable_cache } from "next/cache";

import { AppError } from "@/shared/errors/app-error";

import { findTenantById, findTenantBySlug } from "../repositories/tenant-repository";

export async function getTenantById(tenantId: string) {
  const tenant = await findTenantById(tenantId);
  if (!tenant) {
    throw new AppError("NOT_FOUND", "Tenant not found");
  }
  return tenant;
}

function loadTenantBySlugCached(slug: string) {
  return unstable_cache(
    async () => findTenantBySlug(slug),
    [`tenant-by-slug`, slug],
    { revalidate: 300, tags: [`tenant:${slug}`] },
  )();
}

/** Per-request React.cache + 5min data cache — shared by RSC, actions, and cart API. */
export const getTenantBySlug = cache(async (slug: string) => {
  const tenant = await loadTenantBySlugCached(slug);
  if (!tenant) {
    throw new AppError("NOT_FOUND", "Tenant not found");
  }
  return tenant;
});
