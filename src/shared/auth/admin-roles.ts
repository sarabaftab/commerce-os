import type { MembershipRole } from "@prisma/client";

/** Roles that may change settings, broadcasts, and payment verification (AUD-010). */
export const ADMIN_MANAGER_ROLES = ["owner", "admin"] as const satisfies readonly MembershipRole[];

export function isAdminManagerRole(role: MembershipRole): boolean {
  return (ADMIN_MANAGER_ROLES as readonly MembershipRole[]).includes(role);
}
