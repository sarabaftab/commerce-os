import { NextResponse } from "next/server";

import { safeTelegramAccountPath } from "@/channels/telegram/server/account-session-path";
import { authenticateTelegramInitData } from "@/channels/telegram/server/auth-service";
import {
  attachAttributionCookie,
  attachCustomerSessionCookie,
  createCustomerSession,
} from "@/channels/telegram/server/customer-session";
import { createTelegramSessionHandoff, TELEGRAM_SESSION_HANDOFF_QUERY } from "@/channels/telegram/server/session-handoff";
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
  return `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>Connecting</title></head><body><p>Connecting your account…</p><script>location.replace(${JSON.stringify(nextPath)});</script></body></html>`;
}

export async function handleTelegramSessionFormPost(request: Request, tenantSlug: string) {
  let nextPath = safeTelegramAccountPath(tenantSlug, `/${tenantSlug}/account`);

  try {
    const form = await request.formData();
    nextPath = safeTelegramAccountPath(tenantSlug, String(form.get("next") ?? ""));
    const initData = decodeTelegramInitDataField(form);

    if (!initData) {
      return htmlToAccount(nextPath);
    }

    const tenant = await resolveTenantFromSlug(tenantSlug);
    const { result, sessionToken, startParam } = await authenticateTelegramInitData({
      tenantId: tenant.id,
      tenantSlug: tenant.slug,
      initData,
      existingSession: null,
    });

    let token = sessionToken;
    if (!token) {
      const created = await createCustomerSession({
        tenantId: tenant.id,
        customerId: result.customerId,
      });
      token = created.token;
    }

    const guestToken = readGuestTokenFromRequest(request);
    if (guestToken) {
      await mergeGuestCartIntoCustomer({
        tenantId: tenant.id,
        guestToken,
        customerId: result.customerId,
      });
    }

    const url = new URL(nextPath, request.url);
    url.searchParams.set(TELEGRAM_SESSION_HANDOFF_QUERY, createTelegramSessionHandoff(token));
    const response = htmlToAccount(`${url.pathname}${url.search}`);
    attachCustomerSessionCookie(response, token);
    if (startParam) {
      attachAttributionCookie(response, startParam);
    }
    return response;
  } catch {
    return htmlToAccount(nextPath);
  }
}

function htmlToAccount(nextPath: string) {
  return new NextResponse(connectingHtml(nextPath), {
    status: 200,
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
