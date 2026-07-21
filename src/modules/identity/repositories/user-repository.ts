import type { MembershipRole, Prisma, User } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

export async function findUserBySupabaseId(supabaseUserId: string): Promise<User | null> {
  return prisma.user.findUnique({
    where: { supabaseUserId },
  });
}

export async function findUserByEmail(email: string): Promise<User | null> {
  // Auth emails are case-insensitive; store/query in lowercase for consistency.
  return prisma.user.findUnique({
    where: { email: email.trim().toLowerCase() },
  });
}

export async function findUsersByIds(ids: string[]) {
  if (ids.length === 0) {
    return [];
  }
  return prisma.user.findMany({
    where: { id: { in: ids } },
    select: { id: true, email: true, displayName: true },
  });
}

export async function linkSupabaseUserId(userId: string, supabaseUserId: string) {
  return prisma.user.update({
    where: { id: userId },
    data: { supabaseUserId },
  });
}

export async function findMembershipForUser(userId: string) {
  return prisma.userTenantMembership.findFirst({
    where: { userId },
    include: {
      tenant: true,
      user: true,
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createUser(data: Prisma.UserCreateInput): Promise<User> {
  return prisma.user.create({ data });
}

export async function upsertMembership(input: {
  tenantId: string;
  userId: string;
  role: MembershipRole;
}) {
  return prisma.userTenantMembership.upsert({
    where: {
      tenantId_userId: {
        tenantId: input.tenantId,
        userId: input.userId,
      },
    },
    update: { role: input.role },
    create: input,
  });
}
