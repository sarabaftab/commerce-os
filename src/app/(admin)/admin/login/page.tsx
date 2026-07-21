import { redirect } from "next/navigation";

import { getAdminSession } from "@/shared/auth/admin-session";

import { LoginForm } from "./login-form";

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; error?: string }>;
}) {
  const session = await getAdminSession();
  const params = await searchParams;

  if (session) {
    redirect(params.next && params.next.startsWith("/admin") ? params.next : "/admin");
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 px-4">
      <div className="w-full max-w-md rounded-xl border bg-card p-8 shadow-sm">
        <div className="mb-6 space-y-1">
          <h1 className="text-2xl font-semibold tracking-tight">Admin sign in</h1>
          <p className="text-sm text-muted-foreground">
            Sign in with your CommerceOS admin account.
          </p>
        </div>
        <LoginForm
          nextPath={params.next}
          initialError={
            params.error === "forbidden"
              ? "Signed in, but this account is not linked to an admin membership. Re-run db:seed with SEED_ADMIN_EMAIL and SEED_ADMIN_SUPABASE_USER_ID set."
              : params.error
          }
        />
      </div>
    </div>
  );
}
