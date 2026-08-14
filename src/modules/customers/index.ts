import type { Customer } from "@prisma/client";

import type { CustomerProfileDto } from "./types";

export type { CustomerProfileDto, CustomerAddressDto } from "./types";
export type {
  CustomerOrderListItemDto,
  CustomerOrderListResult,
  CustomerOrderDetailDto,
  CustomerOrderListFilter,
} from "./types";

export {
  customerProfileUpdateSchema,
  customerAddressInputSchema,
  ADDRESS_LABEL_SUGGESTIONS,
} from "./schemas/profile";

export {
  requireCustomerSession,
  getOptionalCustomerSession,
} from "./services/customer-auth";

export {
  getCustomerProfile,
  updateCustomerProfile,
} from "./services/customer-profile-service";

export {
  listCustomerAddresses,
  getOwnedActiveAddressOrThrow,
  createCustomerAddress,
  updateCustomerAddress,
  setDefaultCustomerAddress,
  deactivateCustomerAddress,
} from "./services/customer-address-service";

export {
  listCustomerOrders,
  getCustomerOrderByNumber,
} from "./services/customer-order-query-service";

export {
  findCustomerById,
  findCustomerByIdentity,
  findCustomerByPhone,
  upsertCustomerByPhone,
  updateCustomerContact,
} from "./repositories/customer-repository";

/** Build a display name from first/last when present. */
export function composeDisplayName(customer: Pick<Customer, "firstName" | "lastName" | "displayName">) {
  const parts = [customer.firstName, customer.lastName].filter(Boolean);
  if (parts.length > 0) {
    return parts.join(" ");
  }
  return customer.displayName;
}

export function toProfileDto(
  customer: Customer,
  photoUrl: string | null = null,
): CustomerProfileDto {
  return {
    id: customer.id,
    firstName: customer.firstName,
    lastName: customer.lastName,
    displayName: customer.displayName,
    phone: customer.phone,
    email: customer.email,
    photoUrl,
  };
}
