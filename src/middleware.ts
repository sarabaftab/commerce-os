import { type NextRequest, NextResponse } from "next/server";

import { updateSession } from "@/shared/auth/supabase/middleware";

export async function middleware(request: NextRequest) {
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

  // Lightweight cookie presence check; full membership checked in layouts/actions.
  const hasAuthCookie = request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("auth-token") || cookie.name.includes("sb-"));

  if (!hasAuthCookie) {
    const loginUrl = new URL("/admin/login", request.url);
    loginUrl.searchParams.set("next", pathname);
    return NextResponse.redirect(loginUrl);
  }

  return response;
}

export const config = {
  matcher: ["/admin/:path*"],
};
