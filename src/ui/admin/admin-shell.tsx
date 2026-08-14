import type { AdminSession } from "@/modules/identity";
import { BrandImage } from "@/ui/storefront/brand-image";
import { STOREFRONT_BRAND } from "@/ui/storefront/brand";

import { AdminNav } from "./admin-nav";
import { AdminSignOutButton } from "./admin-sign-out-button";

type AdminShellProps = {
  session: AdminSession;
  children: React.ReactNode;
};

export function AdminShell({ session, children }: AdminShellProps) {
  return (
    <div className="admin-shell min-h-screen text-[color:var(--admin-ink)]">
      <div className="mx-auto flex min-h-screen max-w-[1400px]">
        <aside className="sticky top-0 hidden h-dvh w-64 shrink-0 flex-col border-r border-[color:var(--admin-line)] bg-[color:var(--admin-sidebar)] px-3 py-5 lg:flex">
          <div className="px-2 pb-5">
            <div className="flex items-center gap-3">
              <BrandImage
                src={STOREFRONT_BRAND.logoSrc}
                alt=""
                width={40}
                height={40}
                priority
                className="size-10"
              />
              <div className="min-w-0">
                <p className="truncate font-[family-name:var(--font-admin-display)] text-base font-semibold tracking-tight">
                  {STOREFRONT_BRAND.shortName}
                </p>
                <p className="truncate text-[11px] tracking-[0.12em] text-[color:var(--admin-ink-muted)] uppercase">
                  Admin
                </p>
              </div>
            </div>
            <div className="mt-4 rounded-2xl bg-[color:var(--admin-surface)] px-3 py-3">
              <p className="truncate text-sm font-medium">{session.tenantName}</p>
              <p className="mt-0.5 truncate text-xs capitalize text-[color:var(--admin-ink-muted)]">
                {session.role} · {session.tenantCurrency}
              </p>
            </div>
          </div>

          <div className="flex-1 overflow-y-auto px-1">
            <AdminNav />
          </div>

          <div className="mt-4 space-y-3 border-t border-[color:var(--admin-line)] px-2 pt-4">
            <p className="truncate text-xs text-[color:var(--admin-ink-muted)]">
              {session.email}
            </p>
            <AdminSignOutButton />
          </div>
        </aside>

        <div className="flex min-w-0 flex-1 flex-col">
          <header className="sticky top-0 z-20 border-b border-[color:var(--admin-line)] bg-[color:var(--admin-bg)]/90 backdrop-blur-md lg:hidden">
            <div className="flex items-center justify-between gap-3 px-4 py-3">
              <div className="flex min-w-0 items-center gap-2.5">
                <BrandImage
                  src={STOREFRONT_BRAND.logoSrc}
                  alt=""
                  width={32}
                  height={32}
                  className="size-8"
                />
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold">{session.tenantName}</p>
                  <p className="truncate text-[11px] text-[color:var(--admin-ink-muted)]">
                    {STOREFRONT_BRAND.shortName} Admin
                  </p>
                </div>
              </div>
              <AdminSignOutButton compact />
            </div>
            <div className="px-3 pb-3">
              <AdminNav orientation="horizontal" />
            </div>
          </header>

          <main className="flex-1">
            <div className="mx-auto w-full max-w-6xl px-4 py-6 sm:px-6 sm:py-8">
              {children}
            </div>
          </main>
        </div>
      </div>
    </div>
  );
}
