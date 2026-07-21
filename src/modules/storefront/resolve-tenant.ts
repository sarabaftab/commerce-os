import type { Tenant } from "@prisma/client";
import { notFound } from "next/navigation";

import { getTenantBySlug } from "@/modules/identity";
import { isAppError } from "@/shared/errors/app-error";

export type StorefrontContext = {
  tenant: Tenant;
  basePath: string;
};

export async function resolveStorefrontTenant(tenantSlug: string): Promise<StorefrontContext> {
  try {
    const tenant = await getTenantBySlug(tenantSlug);
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
}
