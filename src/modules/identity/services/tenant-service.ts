import { cache } from "react";

import { AppError } from "@/shared/errors/app-error";

import { findTenantById, findTenantBySlug } from "../repositories/tenant-repository";

export async function getTenantById(tenantId: string) {
  const tenant = await findTenantById(tenantId);
  if (!tenant) {
    throw new AppError("NOT_FOUND", "Tenant not found");
  }
  return tenant;
}

/** Deduped per request — storefront layout/pages/actions often resolve the same slug. */
export const getTenantBySlug = cache(async (slug: string) => {
  const tenant = await findTenantBySlug(slug);
  if (!tenant) {
    throw new AppError("NOT_FOUND", "Tenant not found");
  }
  return tenant;
});
