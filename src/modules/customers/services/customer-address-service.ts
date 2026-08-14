import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import {
  createAddressInTransaction,
  findOwnedActiveAddress,
  findOwnedAddress,
  listActiveAddresses,
  toAddressDto,
  updateAddressInTransaction,
} from "../repositories/address-repository";
import type { CustomerAddressInput } from "../schemas/profile";
import { logCustomerEvent } from "./customer-log";
import type { CustomerAddressDto } from "../types";

export async function listCustomerAddresses(
  tenantId: string,
  customerId: string,
): Promise<CustomerAddressDto[]> {
  const rows = await listActiveAddresses(tenantId, customerId);
  return rows.map(toAddressDto);
}

export async function getOwnedActiveAddressOrThrow(
  tenantId: string,
  customerId: string,
  addressId: string,
): Promise<CustomerAddressDto> {
  const row = await findOwnedActiveAddress(tenantId, customerId, addressId);
  if (!row) {
    throw new AppError("NOT_FOUND", "Address not found");
  }
  return toAddressDto(row);
}

export async function createCustomerAddress(
  tenantId: string,
  customerId: string,
  input: CustomerAddressInput,
): Promise<CustomerAddressDto> {
  const created = await prisma.$transaction(async (tx) => {
    const activeCount = await tx.customerAddress.count({
      where: { tenantId, customerId, isActive: true },
    });
    const makeDefault = activeCount === 0 || Boolean(input.isDefault);

    return createAddressInTransaction(tx, {
      tenantId,
      customerId,
      data: input,
      makeDefault,
    });
  });

  logCustomerEvent("customer.address_created", {
    tenantId,
    customerId,
    addressId: created.id,
  });
  if (created.isDefault) {
    logCustomerEvent("customer.address_default_changed", {
      tenantId,
      customerId,
      addressId: created.id,
    });
  }

  return toAddressDto(created);
}

export async function updateCustomerAddress(
  tenantId: string,
  customerId: string,
  addressId: string,
  input: CustomerAddressInput,
): Promise<CustomerAddressDto> {
  const existing = await findOwnedActiveAddress(tenantId, customerId, addressId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Address not found");
  }

  await prisma.$transaction(async (tx) => {
    const result = await updateAddressInTransaction(tx, {
      tenantId,
      customerId,
      addressId,
      data: {
        ...input,
        // Keep at least one default if this was the only default and user unchecked.
        isDefault:
          input.isDefault ||
          (existing.isDefault &&
            !(await tx.customerAddress.count({
              where: {
                tenantId,
                customerId,
                isActive: true,
                isDefault: true,
                NOT: { id: addressId },
              },
            }))),
      },
    });
    if (result.count === 0) {
      throw new AppError("NOT_FOUND", "Address not found");
    }
  });

  logCustomerEvent("customer.address_updated", { tenantId, customerId, addressId });
  const updated = await findOwnedAddress(tenantId, customerId, addressId);
  if (!updated) {
    throw new AppError("NOT_FOUND", "Address not found");
  }
  if (updated.isDefault) {
    logCustomerEvent("customer.address_default_changed", {
      tenantId,
      customerId,
      addressId,
    });
  }
  return toAddressDto(updated);
}

export async function setDefaultCustomerAddress(
  tenantId: string,
  customerId: string,
  addressId: string,
): Promise<CustomerAddressDto> {
  const existing = await findOwnedActiveAddress(tenantId, customerId, addressId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Address not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.customerAddress.updateMany({
      where: { tenantId, customerId, isActive: true, isDefault: true },
      data: { isDefault: false },
    });
    await tx.customerAddress.updateMany({
      where: { id: addressId, tenantId, customerId, isActive: true },
      data: { isDefault: true },
    });
  });

  logCustomerEvent("customer.address_default_changed", {
    tenantId,
    customerId,
    addressId,
  });

  const updated = await findOwnedActiveAddress(tenantId, customerId, addressId);
  if (!updated) {
    throw new AppError("NOT_FOUND", "Address not found");
  }
  return toAddressDto(updated);
}

export async function deactivateCustomerAddress(
  tenantId: string,
  customerId: string,
  addressId: string,
): Promise<void> {
  const existing = await findOwnedActiveAddress(tenantId, customerId, addressId);
  if (!existing) {
    throw new AppError("NOT_FOUND", "Address not found");
  }

  await prisma.$transaction(async (tx) => {
    await tx.customerAddress.updateMany({
      where: { id: addressId, tenantId, customerId, isActive: true },
      data: { isActive: false, isDefault: false },
    });

    if (existing.isDefault) {
      const next = await tx.customerAddress.findFirst({
        where: { tenantId, customerId, isActive: true },
        orderBy: { updatedAt: "desc" },
      });
      if (next) {
        await tx.customerAddress.update({
          where: { id: next.id },
          data: { isDefault: true },
        });
        logCustomerEvent("customer.address_default_changed", {
          tenantId,
          customerId,
          addressId: next.id,
        });
      }
    }
  });

  logCustomerEvent("customer.address_deactivated", {
    tenantId,
    customerId,
    addressId,
  });
}
