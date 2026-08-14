import { cache } from "react";

import { readCustomerSessionFromCookies } from "@/channels/telegram/server/customer-session";
import { AppError } from "@/shared/errors/app-error";

export type AuthenticatedCustomer = {
  tenantId: string;
  customerId: string;
  sessionId: string;
  channel: "telegram" | "web";
};

/**
 * Resolve the CommerceOS customer session for a trusted tenant id.
 * Never trusts client-supplied customerId.
 */
export async function requireCustomerSession(
  tenantId: string,
): Promise<AuthenticatedCustomer> {
  const session = await getOptionalCustomerSession(tenantId);
  if (!session) {
    throw new AppError("UNAUTHORIZED", "Please sign in to continue");
  }
  return session;
}

/** Deduped per request — layout + account pages share one cookie/session lookup. */
export const getOptionalCustomerSession = cache(
  async (tenantId: string): Promise<AuthenticatedCustomer | null> => {
    const session = await readCustomerSessionFromCookies(tenantId);
    if (!session) {
      return null;
    }
    return {
      tenantId: session.tenantId,
      customerId: session.customerId,
      sessionId: session.sessionId,
      channel: session.channel,
    };
  },
);
