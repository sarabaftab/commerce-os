import type { Prisma } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";
import { formatPhoneForDisplay } from "@/shared/phone/normalize-phone";

import type { CustomerAddressInput } from "../schemas/profile";
import { formatAddressShort, type CustomerAddressDto } from "../types";

export function toAddressDto(row: {
  id: string;
  label: string;
  recipientFirstName: string;
  recipientLastName: string;
  phone: string;
  addressLine1: string;
  addressLine2: string | null;
  cityOrDistrict: string;
  provinceOrState: string;
  postalCode: string | null;
  countryCode: string;
  deliveryInstructions: string | null;
  isDefault: boolean;
  isActive: boolean;
}): CustomerAddressDto {
  return {
    id: row.id,
    label: row.label,
    recipientFirstName: row.recipientFirstName,
    recipientLastName: row.recipientLastName,
    phone: formatPhoneForDisplay(row.phone) || row.phone,
    addressLine1: row.addressLine1,
    addressLine2: row.addressLine2,
    cityOrDistrict: row.cityOrDistrict,
    provinceOrState: row.provinceOrState,
    postalCode: row.postalCode,
    countryCode: row.countryCode,
    deliveryInstructions: row.deliveryInstructions,
    isDefault: row.isDefault,
    isActive: row.isActive,
    formattedShort: formatAddressShort(row),
  };
}

export async function listActiveAddresses(tenantId: string, customerId: string) {
  return prisma.customerAddress.findMany({
    where: { tenantId, customerId, isActive: true },
    orderBy: [{ isDefault: "desc" }, { updatedAt: "desc" }],
  });
}

export async function findOwnedAddress(
  tenantId: string,
  customerId: string,
  addressId: string,
) {
  return prisma.customerAddress.findFirst({
    where: { id: addressId, tenantId, customerId },
  });
}

export async function findOwnedActiveAddress(
  tenantId: string,
  customerId: string,
  addressId: string,
) {
  return prisma.customerAddress.findFirst({
    where: { id: addressId, tenantId, customerId, isActive: true },
  });
}

export async function createAddressInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    customerId: string;
    data: CustomerAddressInput;
    makeDefault: boolean;
  },
) {
  if (input.makeDefault) {
    await tx.customerAddress.updateMany({
      where: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        isActive: true,
        isDefault: true,
      },
      data: { isDefault: false },
    });
  }

  return tx.customerAddress.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      label: input.data.label,
      recipientFirstName: input.data.recipientFirstName,
      recipientLastName: input.data.recipientLastName,
      phone: input.data.phone,
      addressLine1: input.data.addressLine1,
      addressLine2: input.data.addressLine2 ?? null,
      cityOrDistrict: input.data.cityOrDistrict,
      provinceOrState: input.data.provinceOrState,
      postalCode: input.data.postalCode ?? null,
      countryCode: input.data.countryCode,
      deliveryInstructions: input.data.deliveryInstructions ?? null,
      isDefault: input.makeDefault,
      isActive: true,
    },
  });
}

export async function updateAddressInTransaction(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    customerId: string;
    addressId: string;
    data: CustomerAddressInput;
  },
) {
  if (input.data.isDefault) {
    await tx.customerAddress.updateMany({
      where: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        isActive: true,
        isDefault: true,
        NOT: { id: input.addressId },
      },
      data: { isDefault: false },
    });
  }

  return tx.customerAddress.updateMany({
    where: {
      id: input.addressId,
      tenantId: input.tenantId,
      customerId: input.customerId,
      isActive: true,
    },
    data: {
      label: input.data.label,
      recipientFirstName: input.data.recipientFirstName,
      recipientLastName: input.data.recipientLastName,
      phone: input.data.phone,
      addressLine1: input.data.addressLine1,
      addressLine2: input.data.addressLine2 ?? null,
      cityOrDistrict: input.data.cityOrDistrict,
      provinceOrState: input.data.provinceOrState,
      postalCode: input.data.postalCode ?? null,
      countryCode: input.data.countryCode,
      deliveryInstructions: input.data.deliveryInstructions ?? null,
      isDefault: input.data.isDefault ?? false,
    },
  });
}
