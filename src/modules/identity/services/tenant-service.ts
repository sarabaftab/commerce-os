import { AppError } from "@/shared/errors/app-error";

import { findTenantById, findTenantBySlug } from "../repositories/tenant-repository";

export async function getTenantById(tenantId: string) {
  const tenant = await findTenantById(tenantId);
  if (!tenant) {
    throw new AppError("NOT_FOUND", "Tenant not found");
  }
  return tenant;
}

export async function getTenantBySlug(slug: string) {
  const tenant = await findTenantBySlug(slug);
  if (!tenant) {
    throw new AppError("NOT_FOUND", "Tenant not found");
  }
  return tenant;
}
