import type { IdentityChannel, Prisma } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";
import {
  normalizePhoneToE164,
  phoneLookupVariants,
} from "@/shared/phone/normalize-phone";

export async function findCustomerById(tenantId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    include: { identities: true },
  });
}

export async function findTelegramIdentityForCustomer(input: {
  tenantId: string;
  customerId: string;
}) {
  return prisma.customerIdentity.findFirst({
    where: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      channel: "telegram",
    },
  });
}

export async function findCustomerByIdentity(input: {
  tenantId: string;
  channel: IdentityChannel;
  externalId: string;
}) {
  return prisma.customerIdentity.findUnique({
    where: {
      tenantId_channel_externalId: {
        tenantId: input.tenantId,
        channel: input.channel,
        externalId: input.externalId,
      },
    },
    include: { customer: true },
  });
}

/**
 * Tenant-scoped customer lookup by phone.
 * Prefers phoneNormalized (E.164); falls back to legacy phone string variants
 * and verifies each candidate with the same parser to avoid false matches.
 */
export async function findCustomerByPhone(
  tenantId: string,
  phone: string,
  tx: Prisma.TransactionClient | typeof prisma = prisma,
) {
  const e164 = normalizePhoneToE164(phone);
  if (!e164) {
    return tx.customer.findFirst({
      where: { tenantId, phone, deletedAt: null },
    });
  }

  const byNormalized = await tx.customer.findFirst({
    where: { tenantId, phoneNormalized: e164, deletedAt: null },
  });
  if (byNormalized) {
    return byNormalized;
  }

  const variants = phoneLookupVariants(e164);
  const candidates = await tx.customer.findMany({
    where: {
      tenantId,
      deletedAt: null,
      OR: [{ phone: { in: variants } }, { phoneNormalized: { in: variants } }],
    },
    take: 20,
  });

  for (const candidate of candidates) {
    const candidateE164 =
      candidate.phoneNormalized ??
      (candidate.phone ? normalizePhoneToE164(candidate.phone) : null);
    if (candidateE164 === e164) {
      return candidate;
    }
  }

  return null;
}

type UpsertCustomerInput = {
  tenantId: string;
  displayName: string;
  phone: string;
  email?: string;
};

export async function upsertCustomerByPhone(
  tx: Prisma.TransactionClient,
  input: UpsertCustomerInput,
) {
  const e164 = normalizePhoneToE164(input.phone);
  const existing = await findCustomerByPhone(input.tenantId, input.phone, tx);

  let customer;
  if (existing) {
    customer = await tx.customer.update({
      where: { id: existing.id },
      data: {
        displayName: input.displayName,
        phone: input.phone,
        ...(e164 ? { phoneNormalized: e164 } : {}),
        ...(input.email && !existing.email ? { email: input.email } : {}),
      },
    });
  } else {
    customer = await tx.customer.create({
      data: {
        tenantId: input.tenantId,
        displayName: input.displayName,
        phone: input.phone,
        phoneNormalized: e164,
        email: input.email ?? null,
      },
    });

    const webExternalId = e164 ?? input.phone;
    await tx.customerIdentity.upsert({
      where: {
        tenantId_channel_externalId: {
          tenantId: input.tenantId,
          channel: "web",
          externalId: webExternalId,
        },
      },
      update: { customerId: customer.id },
      create: {
        tenantId: input.tenantId,
        customerId: customer.id,
        channel: "web",
        externalId: webExternalId,
      },
    });
  }

  return customer;
}

/**
 * Update contact fields on an already-authenticated customer.
 * Does NOT merge into another customer if the phone matches someone else —
 * Telegram/session identity wins; log conflicts for review.
 */
export async function updateCustomerContact(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    customerId: string;
    displayName: string;
    phone: string;
    email?: string;
  },
) {
  const existing = await tx.customer.findFirst({
    where: {
      id: input.customerId,
      tenantId: input.tenantId,
      deletedAt: null,
    },
  });

  if (!existing) {
    throw new AppError("NOT_FOUND", "Customer not found");
  }

  const e164 = normalizePhoneToE164(input.phone);
  if (e164) {
    const phoneOwner = await findCustomerByPhone(input.tenantId, input.phone, tx);
    if (phoneOwner && phoneOwner.id !== existing.id) {
      console.error("[customer.phone_conflict]", {
        tenantId: input.tenantId,
        sessionCustomerId: existing.id,
        phoneOwnerCustomerId: phoneOwner.id,
        phoneNormalized: e164,
      });
    }
  }

  return tx.customer.update({
    where: { id: existing.id },
    data: {
      displayName: input.displayName,
      phone: input.phone,
      ...(e164 ? { phoneNormalized: e164 } : {}),
      ...(input.email ? { email: input.email } : {}),
    },
  });
}
