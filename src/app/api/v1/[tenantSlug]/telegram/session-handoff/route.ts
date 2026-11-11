import { NextResponse } from "next/server";

import { safeTelegramAccountPath } from "@/channels/telegram/server/account-session-path";
import {
  attachCustomerSessionCookie,
} from "@/channels/telegram/server/customer-session";
import {
  consumeTelegramSessionHandoff,
  TELEGRAM_SESSION_HANDOFF_QUERY,
} from "@/channels/telegram/server/session-handoff";
import { resolveTenantFromSlug } from "@/shared/cart/cart-request";

type RouteContext = {
  params: Promise<{ tenantSlug: string }>;
};

/**
 * AUD-003: Exchange a one-time `tg_s` code for the customer session cookie.
 * Keeps the long-lived session token out of the account URL / browser history.
 */
export async function GET(request: Request, context: RouteContext) {
  const { tenantSlug } = await context.params;
  const fallback = safeTelegramAccountPath(tenantSlug, `/${tenantSlug}/account`);

  try {
    await resolveTenantFromSlug(tenantSlug);
  } catch {
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get(TELEGRAM_SESSION_HANDOFF_QUERY);
  const nextPath = safeTelegramAccountPath(
    tenantSlug,
    url.searchParams.get("next") ?? fallback,
  );

  const sessionToken = await consumeTelegramSessionHandoff(code);
  const redirectUrl = new URL(nextPath, request.url);
  // Never forward the one-time code to the account page.
  redirectUrl.searchParams.delete(TELEGRAM_SESSION_HANDOFF_QUERY);

  const response = NextResponse.redirect(redirectUrl);
  if (sessionToken) {
    attachCustomerSessionCookie(response, sessionToken);
  }
  return response;
}
