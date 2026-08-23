import { createHash, randomBytes } from "node:crypto";

import { cookies } from "next/headers";
import { NextResponse } from "next/server";

import { env } from "@/shared/config/env";
import { prisma } from "@/shared/db/prisma";

export const CUSTOMER_SESSION_COOKIE = "commerceos_customer";
export const ATTRIBUTION_COOKIE = "commerceos_attribution";

export type CustomerSessionPayload = {
  sessionId: string;
  tenantId: string;
  customerId: string;
  channel: "telegram" | "web";
};

function hashToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Mini App pages are first-party on the shop origin (same as the cart cookie).
 * SameSite=None is only for HTTPS tunnels where the WebView origin differs.
 * Production used None before; some Telegram clients drop those cookies while
 * still keeping SameSite=Lax cart cookies — Account then fails for new users.
 */
export function customerSessionCookiePolicy(): {
  sameSite: "none" | "lax";
  secure: boolean;
} {
  const crossSite = process.env.TELEGRAM_FORCE_SECURE_COOKIES === "1";
  const isProd = process.env.NODE_ENV === "production";
  return {
    sameSite: crossSite ? "none" : "lax",
    secure: crossSite || isProd,
  };
}

function sessionCookieOptions() {
  const policy = customerSessionCookiePolicy();
  return {
    httpOnly: true,
    path: "/",
    maxAge: env().CUSTOMER_SESSION_TTL_SECONDS,
    sameSite: policy.sameSite,
    secure: policy.secure,
  };
}

export function buildCustomerSessionCookieHeader(token: string): string {
  const opts = sessionCookieOptions();
  const parts = [
    `${CUSTOMER_SESSION_COOKIE}=${encodeURIComponent(token)}`,
    `Path=${opts.path}`,
    "HttpOnly",
    `SameSite=${opts.sameSite === "none" ? "None" : "Lax"}`,
    `Max-Age=${opts.maxAge}`,
  ];
  if (opts.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export function buildAttributionCookieHeader(referralCode: string): string {
  const policy = customerSessionCookiePolicy();
  const parts = [
    `${ATTRIBUTION_COOKIE}=${encodeURIComponent(referralCode.slice(0, 128))}`,
    "Path=/",
    "HttpOnly",
    `SameSite=${policy.sameSite === "none" ? "None" : "Lax"}`,
    `Max-Age=${60 * 60 * 24 * 30}`,
  ];
  if (policy.secure) {
    parts.push("Secure");
  }
  return parts.join("; ");
}

export async function createCustomerSession(input: {
  tenantId: string;
  customerId: string;
}): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const tokenHash = hashToken(token);
  const ttl = env().CUSTOMER_SESSION_TTL_SECONDS;
  const expiresAt = new Date(Date.now() + ttl * 1000);

  await prisma.customerSession.create({
    data: {
      tenantId: input.tenantId,
      customerId: input.customerId,
      tokenHash,
      expiresAt,
    },
  });

  return { token, expiresAt };
}

export async function revokeCustomerSessionByToken(token: string) {
  await prisma.customerSession.deleteMany({
    where: { tokenHash: hashToken(token) },
  });
}

async function resolveSessionFromToken(
  token: string,
  options?: { touchLastSeen?: boolean },
): Promise<CustomerSessionPayload | null> {
  const row = await prisma.customerSession.findUnique({
    where: { tokenHash: hashToken(token) },
  });

  if (!row) {
    return null;
  }

  if (row.expiresAt.getTime() <= Date.now()) {
    await prisma.customerSession.delete({ where: { id: row.id } }).catch(() => undefined);
    return null;
  }

  const touch = options?.touchLastSeen !== false;
  const LAST_SEEN_THROTTLE_MS = 5 * 60 * 1000;
  if (
    touch &&
    (!row.lastSeenAt || Date.now() - row.lastSeenAt.getTime() >= LAST_SEEN_THROTTLE_MS)
  ) {
    await prisma.customerSession
      .update({
        where: { id: row.id },
        data: { lastSeenAt: new Date() },
      })
      .catch(() => undefined);
  }

  return {
    sessionId: row.id,
    tenantId: row.tenantId,
    customerId: row.customerId,
    channel: "telegram",
  };
}

export async function readCustomerSessionFromCookies(
  tenantId: string,
): Promise<CustomerSessionPayload | null> {
  const cookieStore = await cookies();
  const token = cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value?.trim();
  if (!token) {
    return null;
  }

  const session = await resolveSessionFromToken(token);
  if (!session || session.tenantId !== tenantId) {
    return null;
  }
  return session;
}

export function readCustomerSessionTokenFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }

  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === CUSTOMER_SESSION_COOKIE) {
      const value = rest.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

export async function readCustomerSessionFromRequest(
  tenantId: string,
  request: Request,
): Promise<CustomerSessionPayload | null> {
  const token = readCustomerSessionTokenFromRequest(request);
  if (!token) {
    return null;
  }
  const session = await resolveSessionFromToken(token);
  if (!session || session.tenantId !== tenantId) {
    return null;
  }
  return session;
}

export async function readAttributionFromCookies(): Promise<string | null> {
  const cookieStore = await cookies();
  const value = cookieStore.get(ATTRIBUTION_COOKIE)?.value?.trim();
  return value || null;
}

export function readAttributionFromRequest(request: Request): string | null {
  const cookieHeader = request.headers.get("cookie");
  if (!cookieHeader) {
    return null;
  }
  for (const part of cookieHeader.split(";")) {
    const [name, ...rest] = part.trim().split("=");
    if (name === ATTRIBUTION_COOKIE) {
      const value = rest.join("=");
      return value ? decodeURIComponent(value) : null;
    }
  }
  return null;
}

export function attachCustomerSessionCookie(response: NextResponse, token: string) {
  response.headers.append("Set-Cookie", buildCustomerSessionCookieHeader(token));
  return response;
}

export function attachAttributionCookie(response: NextResponse, referralCode: string) {
  response.headers.append("Set-Cookie", buildAttributionCookieHeader(referralCode));
  return response;
}

export async function setCustomerSessionCookie(token: string) {
  const cookieStore = await cookies();
  const opts = sessionCookieOptions();
  cookieStore.set(CUSTOMER_SESSION_COOKIE, token, opts);
}
