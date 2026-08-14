import Link from "next/link";

import { SettingsSectionForm } from "@/modules/settings/components/settings-section-form";
import { getSettingsForAdmin } from "@/modules/settings";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";
import { cn } from "@/ui/lib/utils";

const tabs = [
  { id: "general", label: "General" },
  { id: "fulfillment", label: "Delivery & Pickup" },
  { id: "payments", label: "Payments" },
  { id: "branding", label: "Branding" },
] as const;

type SettingsPageProps = {
  searchParams: Promise<{ tab?: string }>;
};

export default async function AdminSettingsPage({ searchParams }: SettingsPageProps) {
  const session = await requireAdminSession();
  const { tab: rawTab } = await searchParams;
  const tab = tabs.some((t) => t.id === rawTab) ? (rawTab as (typeof tabs)[number]["id"]) : "general";
  const bundle = await getSettingsForAdmin(session.tenantId);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Settings"
        description={`Configure ${session.tenantName} storefront, checkout, and payments`}
      />

      <div className="flex flex-wrap gap-1.5">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={`/admin/settings?tab=${item.id}`}
            className={cn(
              "rounded-full px-3.5 py-1.5 text-sm font-medium transition",
              tab === item.id
                ? "bg-[color:var(--admin-primary)] text-[color:var(--admin-on-primary)] shadow-sm"
                : "bg-[color:var(--admin-surface-elevated)] text-[color:var(--admin-ink-muted)] ring-1 ring-[color:var(--admin-line)] hover:bg-[color:var(--admin-surface)]",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <div className="rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] p-5 shadow-[var(--admin-shadow)] sm:p-6">
        <SettingsSectionForm bundle={bundle} section={tab} />
      </div>
    </div>
  );
}
