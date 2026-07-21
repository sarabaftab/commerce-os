import type { Prisma, Tenant } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

export async function findTenantById(id: string): Promise<Tenant | null> {
  return prisma.tenant.findFirst({
    where: { id, isActive: true },
  });
}

export async function findTenantBySlug(slug: string): Promise<Tenant | null> {
  return prisma.tenant.findFirst({
    where: { slug, isActive: true },
  });
}

export async function createTenant(data: Prisma.TenantCreateInput): Promise<Tenant> {
  return prisma.tenant.create({ data });
}
