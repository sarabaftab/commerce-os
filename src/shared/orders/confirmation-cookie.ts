import { createHash, randomBytes, timingSafeEqual } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const ORDER_CONFIRMATION_COOKIE = "commerceos_order_confirm";
const CONFIRMATION_COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function createOrderConfirmationToken(): string {
  return randomBytes(32).toString("base64url");
}

function cookieSecure() {
  return (
    process.env.NODE_ENV === "production" ||
    process.env.TELEGRAM_FORCE_SECURE_COOKIES === "1"
  );
}

function cookieSameSite(): "none" | "lax" {
  return cookieSecure() ? "none" : "lax";
}

/** Cookie value format: `${orderNumber}.${token}` scoped to path / */
export function buildOrderConfirmationCookieValue(
  orderNumber: string,
  token: string,
): string {
  return `${orderNumber}.${token}`;
}

export function parseOrderConfirmationCookieValue(
  raw: string | undefined | null,
): { orderNumber: string; token: string } | null {
  if (!raw) return null;
  const decoded = decodeURIComponent(raw);
  const dot = decoded.indexOf(".");
  if (dot <= 0 || dot === decoded.length - 1) return null;
  return {
    orderNumber: decoded.slice(0, dot),
    token: decoded.slice(dot + 1),
  };
}

export function buildOrderConfirmationCookieHeader(
  orderNumber: string,
  token: string,
): string {
  const secure = cookieSecure();
  const parts = [
    `${ORDER_CONFIRMATION_COOKIE}=${encodeURIComponent(
      buildOrderConfirmationCookieValue(orderNumber, token),
    )}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${secure ? "None" : "Lax"}`,
    `Max-Age=${CONFIRMATION_COOKIE_MAX_AGE}`,
  ];
  if (secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function attachOrderConfirmationCookie(
  response: NextResponse,
  orderNumber: string,
  token: string,
) {
  response.headers.append(
    "Set-Cookie",
    buildOrderConfirmationCookieHeader(orderNumber, token),
  );
  return response;
}

export async function setOrderConfirmationCookie(
  orderNumber: string,
  token: string,
) {
  const cookieStore = await cookies();
  cookieStore.set(ORDER_CONFIRMATION_COOKIE, buildOrderConfirmationCookieValue(orderNumber, token), {
    httpOnly: true,
    path: "/",
    maxAge: CONFIRMATION_COOKIE_MAX_AGE,
    sameSite: cookieSameSite(),
    secure: cookieSecure(),
  });
}

export async function readOrderConfirmationCookie(): Promise<{
  orderNumber: string;
  token: string;
} | null> {
  const cookieStore = await cookies();
  return parseOrderConfirmationCookieValue(
    cookieStore.get(ORDER_CONFIRMATION_COOKIE)?.value,
  );
}

export function readOrderConfirmationTokenFromRequest(
  request: Request,
  orderNumber: string,
): string | null {
  const url = new URL(request.url);
  const queryToken = url.searchParams.get("token")?.trim();
  if (queryToken) {
    return queryToken;
  }

  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ORDER_CONFIRMATION_COOKIE) {
      const parsed = parseOrderConfirmationCookieValue(rest.join("="));
      if (parsed && parsed.orderNumber === orderNumber) {
        return parsed.token;
      }
    }
  }

  return null;
}

/** Constant-time compare for confirmation tokens. */
export function confirmationTokensMatch(a: string, b: string): boolean {
  try {
    const aHash = createHash("sha256").update(a).digest();
    const bHash = createHash("sha256").update(b).digest();
    return timingSafeEqual(aHash, bHash);
  } catch {
    return false;
  }
}
