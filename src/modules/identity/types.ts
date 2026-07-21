import type { MembershipRole } from "@prisma/client";

export type AdminSession = {
  userId: string;
  email: string;
  displayName: string | null;
  supabaseUserId: string;
  tenantId: string;
  tenantSlug: string;
  tenantName: string;
  tenantCurrency: string;
  role: MembershipRole;
};
