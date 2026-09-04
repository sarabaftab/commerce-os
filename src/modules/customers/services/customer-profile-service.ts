import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";
import {
  formatPhoneForDisplay,
  normalizePhoneToE164,
} from "@/shared/phone/normalize-phone";

import type { CustomerProfileUpdateInput } from "../schemas/profile";
import { findCustomerByPhone } from "../repositories/customer-repository";
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
    phone: customer.phone ? formatPhoneForDisplay(customer.phone) : customer.phone,
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

  const e164 = normalizePhoneToE164(input.phone);
  if (e164) {
    const phoneOwner = await findCustomerByPhone(tenantId, input.phone);
    if (phoneOwner && phoneOwner.id !== customerId) {
      console.error("[customer.phone_conflict]", {
        tenantId,
        profileCustomerId: customerId,
        phoneOwnerCustomerId: phoneOwner.id,
        phoneNormalized: e164,
      });
    }
  }

  await prisma.customer.update({
    where: { id: customerId },
    data: {
      firstName: input.firstName,
      lastName: input.lastName,
      displayName: input.displayName,
      phone: input.phone,
      ...(e164 ? { phoneNormalized: e164 } : {}),
      email: input.email ?? null,
    },
  });

  logCustomerEvent("customer.profile_updated", { tenantId, customerId });
  return getCustomerProfile(tenantId, customerId);
}
