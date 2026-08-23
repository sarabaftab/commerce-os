import {
  getOptionalCustomerSession,
  type AuthenticatedCustomer,
} from "./services/customer-auth";

/**
 * Account pages always execute even when layout hides `{children}`.
 * Do not throw here — the layout shows the Telegram auth gate instead.
 */
export async function loadAccountPageSession(
  tenantId: string,
): Promise<AuthenticatedCustomer | null> {
  return getOptionalCustomerSession(tenantId);
}
