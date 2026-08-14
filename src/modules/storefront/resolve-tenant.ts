import { cache } from "react";
import { unstable_cache } from "next/cache";
import type { Tenant } from "@prisma/client";
import { notFound } from "next/navigation";

import { findTenantBySlug } from "@/modules/identity/repositories/tenant-repository";
import { AppError, isAppError } from "@/shared/errors/app-error";

export type StorefrontContext = {
  tenant: Tenant;
  basePath: string;
};

async function loadTenantBySlug(slug: string): Promise<Tenant | null> {
  return unstable_cache(
    async () => findTenantBySlug(slug),
    [`storefront-tenant`, slug],
    { revalidate: 300, tags: [`tenant:${slug}`] },
  )();
}

/** Deduped per request; cross-request cached for ISR public shell. */
export const resolveStorefrontTenant = cache(
  async (tenantSlug: string): Promise<StorefrontContext> => {
    try {
      const tenant = await loadTenantBySlug(tenantSlug);
      if (!tenant || !tenant.isActive) {
        throw new AppError("NOT_FOUND", "Tenant not found");
      }
      return {
        tenant,
        basePath: `/${tenant.slug}`,
      };
    } catch (error) {
      if (isAppError(error) && error.code === "NOT_FOUND") {
        notFound();
      }
      throw error;
    }
  },
);
