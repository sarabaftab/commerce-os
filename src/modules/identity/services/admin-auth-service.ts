import { AppError } from "@/shared/errors/app-error";
import { prisma } from "@/shared/db/prisma";
import { createTimer } from "@/shared/observability/timing";

import type { AdminSession } from "../types";
import {
  findUserByEmail,
  linkSupabaseUserId,
} from "../repositories/user-repository";

export async function resolveAdminSession(input: {
  supabaseUserId: string;
  email: string;
}): Promise<AdminSession> {
  const timer = createTimer("admin.membership");

  let membership = await prisma.userTenantMembership.findFirst({
    where: {
      user: { supabaseUserId: input.supabaseUserId },
    },
    include: {
      tenant: true,
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });
  timer.mark("lookupMs");

  // First login after seed: link by email ONLY when ALLOW_ADMIN_EMAIL_LINK=1.
  // Never imply this from NODE_ENV — mis-set Vercel envs used to enable takeover (AUD-004).
  // Production must not enable the flag at all.
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ALLOW_ADMIN_EMAIL_LINK === "1"
  ) {
    throw new Error("ALLOW_ADMIN_EMAIL_LINK must not be enabled in production");
  }

  if (!membership && process.env.ALLOW_ADMIN_EMAIL_LINK === "1") {
    const byEmail = await findUserByEmail(input.email);
    if (byEmail && !byEmail.supabaseUserId) {
      await linkSupabaseUserId(byEmail.id, input.supabaseUserId);
      membership = await prisma.userTenantMembership.findFirst({
        where: { userId: byEmail.id },
        include: {
          tenant: true,
          user: true,
        },
        orderBy: { createdAt: "asc" },
      });
      timer.mark("linkMs");
    }
  }

  timer.log();

  if (!membership) {
    throw new AppError("FORBIDDEN", "No admin account found for this user");
  }

  if (!membership.tenant.isActive) {
    throw new AppError("FORBIDDEN", "No active tenant membership for this user");
  }

  return {
    userId: membership.user.id,
    email: membership.user.email,
    displayName: membership.user.displayName,
    supabaseUserId: input.supabaseUserId,
    tenantId: membership.tenantId,
    tenantSlug: membership.tenant.slug,
    tenantName: membership.tenant.name,
    tenantCurrency: membership.tenant.currency,
    role: membership.role,
  };
}
