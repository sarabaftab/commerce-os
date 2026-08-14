import { redirect } from "next/navigation";

import { getAdminSession } from "@/shared/auth/admin-session";
import { BrandImage } from "@/ui/storefront/brand-image";
import { STOREFRONT_BRAND } from "@/ui/storefront/brand";

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
    <div className="admin-shell flex min-h-screen items-center justify-center px-4 py-10">
      <div className="w-full max-w-md overflow-hidden rounded-[1.75rem] border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
        <div className="border-b border-[color:var(--admin-line)] bg-[color:var(--admin-surface)]/50 px-8 py-6">
          <div className="flex items-center gap-3">
            <BrandImage
              src={STOREFRONT_BRAND.logoSrc}
              alt=""
              width={44}
              height={44}
              priority
              className="size-11"
            />
            <div>
              <p className="font-[family-name:var(--font-admin-display)] text-lg font-semibold tracking-tight">
                {STOREFRONT_BRAND.shortName}
              </p>
              <p className="text-xs tracking-[0.14em] text-[color:var(--admin-ink-muted)] uppercase">
                Admin console
              </p>
            </div>
          </div>
        </div>
        <div className="space-y-6 px-8 py-7">
          <div className="space-y-1">
            <h1 className="font-[family-name:var(--font-admin-display)] text-2xl tracking-tight">
              Sign in
            </h1>
            <p className="text-sm text-[color:var(--admin-ink-muted)]">
              Manage orders and catalog for your store.
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
    </div>
  );
}
