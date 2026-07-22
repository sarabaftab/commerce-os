import type { Prisma } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

export async function findSettingsByTenantId(tenantId: string) {
  return prisma.tenantSettings.findUnique({ where: { tenantId } });
}

export async function findTenantWithSettings(tenantId: string) {
  return prisma.tenant.findFirst({
    where: { id: tenantId, isActive: true },
    include: {
      settings: true,
      pickupLocations: { orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }] },
    },
  });
}

export async function ensureSettingsRow(tenantId: string, defaults?: {
  displayName?: string;
  timezone?: string;
  abaInstructions?: string | null;
}) {
  return prisma.tenantSettings.upsert({
    where: { tenantId },
    update: {},
    create: {
      tenantId,
      displayName: defaults?.displayName ?? null,
      timezone: defaults?.timezone ?? "Asia/Phnom_Penh",
      abaInstructions: defaults?.abaInstructions ?? null,
    },
  });
}

export async function updateSettings(
  tenantId: string,
  data: Prisma.TenantSettingsUpdateInput,
) {
  return prisma.tenantSettings.update({
    where: { tenantId },
    data,
  });
}

export async function updateTenantCurrency(tenantId: string, currency: string) {
  return prisma.tenant.update({
    where: { id: tenantId },
    data: { currency },
  });
}

export async function listPickupLocations(tenantId: string) {
  return prisma.pickupLocation.findMany({
    where: { tenantId },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function listActivePickupLocations(tenantId: string) {
  return prisma.pickupLocation.findMany({
    where: { tenantId, isActive: true },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }],
  });
}

export async function findPickupLocation(tenantId: string, id: string) {
  return prisma.pickupLocation.findFirst({
    where: { id, tenantId },
  });
}

export async function createPickupLocation(input: {
  tenantId: string;
  name: string;
  address: string;
  instructions?: string | null;
  isActive: boolean;
  sortOrder: number;
}) {
  return prisma.pickupLocation.create({ data: input });
}

export async function updatePickupLocation(
  tenantId: string,
  id: string,
  data: {
    name: string;
    address: string;
    instructions?: string | null;
    isActive: boolean;
    sortOrder: number;
  },
) {
  return prisma.pickupLocation.updateMany({
    where: { id, tenantId },
    data,
  });
}

export async function deletePickupLocation(tenantId: string, id: string) {
  return prisma.pickupLocation.deleteMany({
    where: { id, tenantId },
  });
}
