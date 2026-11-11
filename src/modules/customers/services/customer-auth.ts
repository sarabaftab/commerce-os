import { cache } from "react";
import { headers } from "next/headers";

import { TELEGRAM_ACCOUNT_ACCESS_HEADER } from "@/channels/telegram/account-access-constants";
import { verifyTelegramAccountAccess } from "@/channels/telegram/server/account-access";
import { readCustomerSessionFromCookies } from "@/channels/telegram/server/customer-session";
import { AppError } from "@/shared/errors/app-error";

export type AuthenticatedCustomer = {
  tenantId: string;
  customerId: string;
  sessionId: string;
  channel: "telegram" | "web";
  /** How identity was established for this request. */
  resolvedVia: "cookie" | "telegram_access_proof";
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

/**
 * Deduped per request — layout + account pages share one lookup.
 *
 * Precedence:
 * 1. Valid commerceos_customer cookie session
 * 2. Short-lived Telegram Account access proof (from verified initData)
 */
export const getOptionalCustomerSession = cache(
  async (tenantId: string): Promise<AuthenticatedCustomer | null> => {
    const fromCookie = await readCustomerSessionFromCookies(tenantId);
    if (fromCookie) {
      return {
        tenantId: fromCookie.tenantId,
        customerId: fromCookie.customerId,
        sessionId: fromCookie.sessionId,
        channel: fromCookie.channel,
        resolvedVia: "cookie",
      };
    }

    const headerStore = await headers();
    const accessCode = headerStore.get(TELEGRAM_ACCOUNT_ACCESS_HEADER);
    const fromProof = await verifyTelegramAccountAccess({
      tenantId,
      code: accessCode,
    });
    if (!fromProof) {
      return null;
    }

    return {
      tenantId: fromProof.tenantId,
      customerId: fromProof.customerId,
      sessionId: fromProof.sessionId,
      channel: "telegram",
      resolvedVia: "telegram_access_proof",
    };
  },
);
