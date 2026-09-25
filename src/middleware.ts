import {
  TELEGRAM_ACCOUNT_ACCESS_HEADER,
  TELEGRAM_ACCOUNT_ACCESS_QUERY,
} from "@/channels/telegram/account-access-constants";
import { updateSession } from "@/shared/auth/supabase/middleware";
import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

function isStorefrontAccountPath(pathname: string): boolean {
  const parts = pathname.split("/").filter(Boolean);
  return parts.length >= 2 && parts[1] === "account";
}

/**
 * Forward opaque tg_a from the Account URL onto an internal request header.
 * Never trusts a client-supplied copy of that header.
 * Proof validation happens in Node (Account resolver), not Edge.
 */
function withTelegramAccountAccessHeader(request: NextRequest): NextResponse {
  const requestHeaders = new Headers(request.headers);
  requestHeaders.delete(TELEGRAM_ACCOUNT_ACCESS_HEADER);
  const code = request.nextUrl.searchParams.get(TELEGRAM_ACCOUNT_ACCESS_QUERY)?.trim();
  if (code) {
    requestHeaders.set(TELEGRAM_ACCOUNT_ACCESS_HEADER, code);
  }
  return NextResponse.next({
    request: { headers: requestHeaders },
  });
}

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (isStorefrontAccountPath(pathname)) {
    return withTelegramAccountAccessHeader(request);
  }

  const isAdminApiRoute = pathname.startsWith("/api/admin");
  const isAdminRoute = pathname.startsWith("/admin");
  const isLoginRoute = pathname === "/admin/login";

  const response = await updateSession(request);

  // Admin API routes need cookie refresh, but must not HTML-redirect (fetch callers
  // expect JSON 401 from the route handler when unauthenticated).
  if (isAdminApiRoute || !isAdminRoute || isLoginRoute) {
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
  matcher: [
    "/admin/:path*",
    "/api/admin/:path*",
    "/:tenantSlug/account",
    "/:tenantSlug/account/:path*",
  ],
};
