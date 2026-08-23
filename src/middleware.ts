import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import {
  readTelegramSessionHandoff,
  TELEGRAM_SESSION_HANDOFF_QUERY,
} from "@/channels/telegram/server/session-handoff";
import { updateSession } from "@/shared/auth/supabase/middleware";

const CUSTOMER_SESSION_COOKIE = "commerceos_customer";

async function applyHandoffCookie(request: NextRequest): Promise<NextResponse | null> {
  const { pathname, searchParams } = request.nextUrl;
  if (!pathname.includes("/account")) {
    return null;
  }
  const raw = searchParams.get(TELEGRAM_SESSION_HANDOFF_QUERY);
  if (!raw) {
    return null;
  }
  const sessionToken = await readTelegramSessionHandoff(raw);
  const url = request.nextUrl.clone();
  url.searchParams.delete(TELEGRAM_SESSION_HANDOFF_QUERY);
  const response = NextResponse.redirect(url);
  if (sessionToken) {
    const crossSite = process.env.TELEGRAM_FORCE_SECURE_COOKIES === "1";
    const isProd = process.env.NODE_ENV === "production";
    response.cookies.set(CUSTOMER_SESSION_COOKIE, sessionToken, {
      httpOnly: true,
      path: "/",
      sameSite: crossSite ? "none" : "lax",
      secure: crossSite || isProd,
      maxAge: 60 * 60 * 24 * 30,
    });
  }
  return response;
}

export async function middleware(request: NextRequest) {
  const handoffResponse = await applyHandoffCookie(request);
  if (handoffResponse) {
    return handoffResponse;
  }

  const { pathname } = request.nextUrl;

  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";

  const response = await updateSession(request);

  if (!isAdminRoute || isLoginRoute) {
    return response;
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/admin/login", request.url));
  }

  // Validate the session with Supabase Auth (not cookie-name presence).
  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value);
        });
        cookiesToSet.forEach(({ name, value, options }) => {
          response.cookies.set(name, value, options);
        });
      },
    },
  });

  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*", "/:tenantSlug/account", "/:tenantSlug/account/:path*"],
};
