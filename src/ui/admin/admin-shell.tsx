import type { AdminSession } from "@/modules/identity";
import { Separator } from "@/ui/components/ui/separator";

import { AdminNav } from "./admin-nav";
import { AdminSignOutButton } from "./admin-sign-out-button";

type AdminShellProps = {
  session: AdminSession;
  children: React.ReactNode;
};

export function AdminShell({ session, children }: AdminShellProps) {
  return (
    <div className="flex min-h-screen bg-background">
      <aside className="flex w-60 flex-col border-r bg-sidebar text-sidebar-foreground">
        <div className="px-4 py-5">
          <div className="text-xs uppercase tracking-wide text-muted-foreground">
            CommerceOS
          </div>
          <div className="mt-1 font-semibold">{session.tenantName}</div>
          <div className="text-xs text-muted-foreground">{session.role}</div>
        </div>
        <Separator />
        <div className="flex-1 px-2 py-4">
          <AdminNav />
        </div>
        <div className="space-y-2 border-t px-4 py-4">
          <div className="truncate text-sm">{session.email}</div>
          <AdminSignOutButton />
        </div>
      </aside>
      <main className="flex-1 overflow-auto">
        <div className="mx-auto max-w-6xl px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
