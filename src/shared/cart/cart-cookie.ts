import { randomUUID } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

export const CART_COOKIE_NAME = "commerceos_cart";
export const CART_COOKIE_MAX_AGE = 60 * 60 * 24 * 30; // 30 days

export function createGuestToken(): string {
  return randomUUID();
}

export async function readGuestTokenFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(CART_COOKIE_NAME)?.value?.trim();
  return value || null;
}

export function buildCartCookieHeader(guestToken: string): string {
  const parts = [
    `${CART_COOKIE_NAME}=${encodeURIComponent(guestToken)}`,
    "Path=/",
    "HttpOnly",
    "SameSite=Lax",
    `Max-Age=${CART_COOKIE_MAX_AGE}`,
  ];
  if (process.env.NODE_ENV === "production") {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function attachCartCookie(response: NextResponse, guestToken: string) {
  response.headers.append("Set-Cookie", buildCartCookieHeader(guestToken));
  return response;
}

export function readGuestTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CART_COOKIE_NAME) {
      const value = rest.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  }

  return null;
}
