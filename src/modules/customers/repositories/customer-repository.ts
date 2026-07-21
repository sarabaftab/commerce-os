import type { IdentityChannel, Prisma } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

export async function findCustomerById(tenantId: string, customerId: string) {
  return prisma.customer.findFirst({
    where: { id: customerId, tenantId, deletedAt: null },
    include: { identities: true },
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

export async function findCustomerByPhone(tenantId: string, phone: string) {
  return prisma.customer.findFirst({
    where: { tenantId, phone, deletedAt: null },
  });
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
  const existing = await tx.customer.findFirst({
    where: { tenantId: input.tenantId, phone: input.phone, deletedAt: null },
  });

  let customer;
  if (existing) {
    customer = await tx.customer.update({
      where: { id: existing.id },
      data: {
        displayName: input.displayName,
        ...(input.email && !existing.email ? { email: input.email } : {}),
      },
    });
  } else {
    customer = await tx.customer.create({
      data: {
        tenantId: input.tenantId,
        displayName: input.displayName,
        phone: input.phone,
        email: input.email ?? null,
      },
    });

    await tx.customerIdentity.upsert({
      where: {
        tenantId_channel_externalId: {
          tenantId: input.tenantId,
          channel: "web",
          externalId: input.phone,
        },
      },
      update: { customerId: customer.id },
      create: {
        tenantId: input.tenantId,
        customerId: customer.id,
        channel: "web",
        externalId: input.phone,
      },
    });
  }

  return customer;
}
