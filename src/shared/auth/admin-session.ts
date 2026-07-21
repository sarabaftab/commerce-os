import { cache } from "react";
import { redirect } from "next/navigation";

import { resolveAdminSession, type AdminSession } from "@/modules/identity";
import { AppError } from "@/shared/errors/app-error";
import { createTimer, timeAsync } from "@/shared/observability/timing";

import { createSupabaseServerClient } from "./supabase/server";

/** Cached per request — Auth getUser is relatively expensive over the network. */
export const getAuthUser = cache(async () => {
  const { result: user, ms } = await timeAsync("supabase.auth.getUser", async () => {
    const supabase = await createSupabaseServerClient();
    const {
      data: { user },
    } = await supabase.auth.getUser();
    return user;
  });

  console.info("[timing]", { label: "auth.getUser", ms });
  return user;
});

/**
 * Cached per request so layout + page share one Auth + DB round-trip.
 */
export const getAdminSession = cache(async (): Promise<AdminSession | null> => {
  const timer = createTimer("admin.session");

  const user = await getAuthUser();
  timer.mark("authMs");

  if (!user?.email) {
    timer.log({ authenticated: false });
    return null;
  }

  try {
    const session = await resolveAdminSession({
      supabaseUserId: user.id,
      email: user.email,
    });
    timer.mark("membershipMs");
    timer.log({ authenticated: true, tenant: session.tenantSlug });
    return session;
  } catch (error) {
    if (
      error instanceof AppError &&
      (error.code === "FORBIDDEN" || error.code === "NOT_FOUND")
    ) {
      timer.log({ authenticated: true, membership: false });
      return null;
    }
    throw error;
  }
});

export async function requireAdminSession(): Promise<AdminSession> {
  const session = await getAdminSession();

  if (!session) {
    const user = await getAuthUser();
    if (user) {
      redirect("/admin/login?error=forbidden");
    }
    redirect("/admin/login");
  }

  return session;
}
