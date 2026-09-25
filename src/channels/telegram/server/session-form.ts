import { NextResponse } from "next/server";

import { safeTelegramAccountPath } from "@/channels/telegram/server/account-session-path";
import { authenticateTelegramInitData } from "@/channels/telegram/server/auth-service";
import {
  attachAttributionCookie,
  attachCustomerSessionCookie,
  createCustomerSession,
  readCustomerSessionTokenFromRequest,
} from "@/channels/telegram/server/customer-session";
import {
  createTelegramSessionHandoff,
  TELEGRAM_SESSION_HANDOFF_QUERY,
} from "@/channels/telegram/server/session-handoff";
import { mergeGuestCartIntoCustomer } from "@/modules/orders/services/cart-merge";
import { readGuestTokenFromRequest } from "@/shared/cart/cart-cookie";
import { resolveTenantFromSlug } from "@/shared/cart/cart-request";

export function decodeTelegramInitDataField(form: FormData): string {
  const encoded = String(form.get("initDataB64") ?? "").trim();
  if (encoded) {
    try {
      return Buffer.from(encoded, "base64").toString("utf8").trim();
    } catch {
      return "";
    }
  }
  return String(form.get("initData") ?? "").trim();
}

function connectingHtml(nextPath: string): string {
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connecting</title></head><body><p>Connecting your account…</p><script>location.replace(${JSON.stringify(nextPath)});</script></body></html>`;
}

/**
 * Build the document URL that applies the session cookie via 200 HTML
 * (Desktop-safe) before entering Account.
 */
export function buildTelegramSessionCompletePath(
  tenantSlug: string,
  nextPath: string,
  handoff: string,
): string {
  const params = new URLSearchParams();
  params.set(TELEGRAM_SESSION_HANDOFF_QUERY, handoff);
  params.set("next", nextPath);
  return `/${tenantSlug}/telegram-session/complete?${params.toString()}`;
}

export async function handleTelegramSessionFormPost(request: Request, tenantSlug: string) {
  let nextPath = safeTelegramAccountPath(tenantSlug, `/${tenantSlug}/account`);
  const requestUrl = new URL(request.url);

  try {
    const form = await request.formData();
    nextPath = safeTelegramAccountPath(tenantSlug, String(form.get("next") ?? ""));
    const initData = decodeTelegramInitDataField(form);

    if (!initData) {
      console.info(
        JSON.stringify({
          event: "telegram_session.created",
          tenantSlug,
          ok: false,
          reason: "missing_init_data",
          host: requestUrl.host,
          protocol: requestUrl.protocol.replace(":", ""),
          cookieSet: false,
        }),
      );
      return htmlToAccount(nextPath);
    }

    const tenant = await resolveTenantFromSlug(tenantSlug);
    const { result, sessionToken, sessionId: authSessionId, startParam } =
      await authenticateTelegramInitData({
        tenantId: tenant.id,
        tenantSlug: tenant.slug,
        initData,
        existingSession: null,
      });

    let token = sessionToken;
    let sessionId = authSessionId;
    if (!token || !sessionId) {
      const created = await createCustomerSession({
        tenantId: tenant.id,
        customerId: result.customerId,
      });
      token = created.token;
      sessionId = created.sessionId;
    }

    const guestToken = readGuestTokenFromRequest(request);
    if (guestToken) {
      await mergeGuestCartIntoCustomer({
        tenantId: tenant.id,
        guestToken,
        customerId: result.customerId,
      });
    }

    const handoff = await createTelegramSessionHandoff({
      tenantId: tenant.id,
      sessionId,
    });
    const completePath = buildTelegramSessionCompletePath(tenantSlug, nextPath, handoff);
    const response = htmlToAccount(completePath);
    attachCustomerSessionCookie(response, token);
    if (startParam) {
      attachAttributionCookie(response, startParam);
    }

    console.info(
      JSON.stringify({
        event: "telegram_session.created",
        tenantId: tenant.id,
        tenantSlug,
        customerId: result.customerId,
        host: requestUrl.host,
        protocol: requestUrl.protocol.replace(":", ""),
        cookieSet: true,
        handoffQueued: true,
        hadGuestToken: Boolean(guestToken),
        cookieAlreadyPresent: Boolean(readCustomerSessionTokenFromRequest(request)),
      }),
    );

    return response;
  } catch {
    console.error(
      JSON.stringify({
        event: "telegram_session.created",
        tenantSlug,
        ok: false,
        reason: "auth_or_persist_failed",
        host: requestUrl.host,
        protocol: requestUrl.protocol.replace(":", ""),
        cookieSet: false,
      }),
    );
    return htmlToAccount(nextPath);
  }
}

function htmlToAccount(nextPath: string) {
  return new NextResponse(connectingHtml(nextPath), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
