import { NextResponse } from "next/server";

import { safeTelegramAccountPath } from "@/channels/telegram/server/account-session-path";
import { attachCustomerSessionCookie } from "@/channels/telegram/server/customer-session";
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
 * Primary Desktop path is `/[tenant]/telegram-session/complete` (HTML + Account access);
 * this API redirect remains as a compatible alternate without putting the session in the URL.
 */
export async function GET(request: Request, context: RouteContext) {
  const { tenantSlug } = await context.params;
  const fallback = safeTelegramAccountPath(tenantSlug, `/${tenantSlug}/account`);

  let tenantId: string | null = null;
  try {
    const tenant = await resolveTenantFromSlug(tenantSlug);
    tenantId = tenant.id;
  } catch {
    return NextResponse.redirect(new URL(fallback, request.url));
  }

  const url = new URL(request.url);
  const code = url.searchParams.get(TELEGRAM_SESSION_HANDOFF_QUERY);
  const nextPath = safeTelegramAccountPath(
    tenantSlug,
    url.searchParams.get("next") ?? fallback,
  );

  const sessionToken = await consumeTelegramSessionHandoff({
    tenantId,
    code,
  });
  const redirectUrl = new URL(nextPath, request.url);
  // Never forward the one-time code to the account page.
  redirectUrl.searchParams.delete(TELEGRAM_SESSION_HANDOFF_QUERY);

  const response = NextResponse.redirect(redirectUrl);
  if (sessionToken) {
    attachCustomerSessionCookie(response, sessionToken);
  }
  return response;
}
