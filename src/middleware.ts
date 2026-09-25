import { type NextRequest, NextResponse } from "next/server";
import { createServerClient } from "@supabase/ssr";

import { updateSession } from "@/shared/auth/supabase/middleware";

/**
 * Telegram session handoff no longer uses middleware 307 redirects.
 * Desktop WebViews often drop Set-Cookie on redirects; handoff is applied by
 * GET /[tenant]/telegram-session/complete (200 HTML + Set-Cookie) instead.
 */

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

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
  matcher: ["/admin/:path*", "/api/admin/:path*"],
};
