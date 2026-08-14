import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import type { CustomerProfileUpdateInput } from "../schemas/profile";
import { logCustomerEvent } from "./customer-log";
import type { CustomerProfileDto } from "../types";

function photoFromIdentities(
  identities: { channel: string; meta: unknown }[],
): string | null {
  const telegram = identities.find((i) => i.channel === "telegram");
  if (!telegram || !telegram.meta || typeof telegram.meta !== "object") {
    return null;
  }
  const meta = telegram.meta as Record<string, unknown>;
  return typeof meta.photoUrl === "string" ? meta.photoUrl : null;
}

export async function getCustomerProfile(
  tenantId: string,
  customerId: string,
): Promise<CustomerProfileDto> {
  const customer = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    include: { identities: true },
  });

  if (!customer) {
    throw new AppError("NOT_FOUND", "Profile not found");
  }

  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    displayName: customer.displayName,
    phone: customer.phone,
    email: customer.email,
    photoUrl: photoFromIdentities(customer.identities),
  };
}

export async function updateCustomerProfile(
  tenantId: string,
  customerId: string,
  input: CustomerProfileUpdateInput,
): Promise<CustomerProfileDto> {
  const existing = await prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
  });
  if (!existing) {
    throw new AppError("NOT_FOUND", "Profile not found");
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: input.displayName,
      phone: input.phone,
      email: input.email ?? null,
    },
  });

  logCustomerEvent("customer.profile_updated", { tenantId, customerId });
  return getCustomerProfile(tenantId, customerId);
}
