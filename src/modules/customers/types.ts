import type { Customer, CustomerIdentity, IdentityChannel } from "@prisma/client";

export type { Customer, CustomerIdentity, IdentityChannel };

export type CustomerWithIdentities = Customer & {
  identities: CustomerIdentity[];
};
