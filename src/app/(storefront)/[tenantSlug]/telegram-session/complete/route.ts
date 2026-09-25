import { NextResponse } from "next/server";

import {
  TELEGRAM_ACCOUNT_ACCESS_QUERY,
  TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY,
} from "@/channels/telegram/account-access-constants";
import { appendTelegramAccountAccessQuery } from "@/channels/telegram/server/account-access";
import { safeTelegramAccountPath } from "@/channels/telegram/server/account-session-path";
import {
  attachCustomerSessionCookie,
  readCustomerSessionTokenFromRequest,
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
 * Consume a one-time tg_s handoff code via document GET (200 HTML + Set-Cookie).
 * Also forwards the opaque Account access proof (tg_a) into sessionStorage + next URL
 * so Desktop can open Account when commerceos_customer does not persist.
 */
export async function GET(request: Request, context: RouteContext) {
  const { tenantSlug } = await context.params;
  const url = new URL(request.url);
  const handoffCode = url.searchParams.get(TELEGRAM_SESSION_HANDOFF_QUERY);
  const accessCode = url.searchParams.get(TELEGRAM_ACCOUNT_ACCESS_QUERY);
  const nextPath = safeTelegramAccountPath(
    tenantSlug,
    url.searchParams.get("next") ?? `/${tenantSlug}/account`,
  );
  const host = url.host;
  const cookieAlreadyPresent = Boolean(readCustomerSessionTokenFromRequest(request));

  let cookieSet = false;
  let sessionToken: string | null = null;

  try {
    const tenant = await resolveTenantFromSlug(tenantSlug);
    sessionToken = await consumeTelegramSessionHandoff({
      tenantId: tenant.id,
      code: handoffCode,
    });
    cookieSet = Boolean(sessionToken);
  } catch {
    cookieSet = false;
  }

  console.info(
    JSON.stringify({
      event: "telegram_session.handoff_complete",
      tenantSlug,
      host,
      protocol: url.protocol.replace(":", ""),
      handoffPresent: Boolean(handoffCode),
      handoffValid: cookieSet,
      accountAccessPresent: Boolean(accessCode),
      cookieAlreadyPresent,
      cookieSet,
      nextPath,
    }),
  );

  const response = new NextResponse(connectingHtml(nextPath, accessCode), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });

  if (sessionToken) {
    attachCustomerSessionCookie(response, sessionToken);
  }

  return response;
}

function connectingHtml(nextPath: string, accessCode: string | null) {
  const code = accessCode?.trim() || "";
  const storage = code
    ? `try{sessionStorage.setItem(${JSON.stringify(TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY)},${JSON.stringify(code)});}catch(e){}`
    : "";
  const target = code ? appendTelegramAccountAccessQuery(nextPath, code) : nextPath;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connecting</title></head><body><p>Connecting your account…</p><script>${storage}location.replace(${JSON.stringify(target)});</script></body></html>`;
}
