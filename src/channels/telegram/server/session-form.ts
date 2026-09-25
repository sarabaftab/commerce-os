import {
  TELEGRAM_ACCOUNT_ACCESS_QUERY,
  TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY,
} from "@/channels/telegram/account-access-constants";
import {
  appendTelegramAccountAccessQuery,
  createTelegramAccountAccess,
} from "@/channels/telegram/server/account-access";
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
import { NextResponse } from "next/server";

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

function connectingHtml(nextPath: string, accessCode?: string | null) {
  const storage =
    accessCode != null && accessCode.length > 0
      ? `try{sessionStorage.setItem(${JSON.stringify(TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY)},${JSON.stringify(accessCode)});}catch(e){}`
      : "";
  const target =
    accessCode != null && accessCode.length > 0
      ? appendTelegramAccountAccessQuery(nextPath, accessCode)
      : nextPath;
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="referrer" content="no-referrer"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connecting</title></head><body><p>Connecting your account…</p><script>${storage}location.replace(${JSON.stringify(target)});</script></body></html>`;
}

/**
 * Build the document URL that applies the session cookie via 200 HTML
 * (Desktop-safe) before entering Account.
 */
export function buildTelegramSessionCompletePath(
  tenantSlug: string,
  nextPath: string,
  handoff: string,
  accessCode?: string,
): string {
  const params = new URLSearchParams();
  params.set(TELEGRAM_SESSION_HANDOFF_QUERY, handoff);
  if (accessCode) {
    params.set(TELEGRAM_ACCOUNT_ACCESS_QUERY, accessCode);
  }
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
    const accessCode = await createTelegramAccountAccess({
      tenantId: tenant.id,
      customerId: result.customerId,
      sessionId,
    });
    const completePath = buildTelegramSessionCompletePath(
      tenantSlug,
      nextPath,
      handoff,
      accessCode,
    );
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
        accountAccessQueued: true,
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

function htmlToAccount(nextPath: string, accessCode?: string | null) {
  return new NextResponse(connectingHtml(nextPath, accessCode), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
      "Referrer-Policy": "no-referrer",
    },
  });
}
