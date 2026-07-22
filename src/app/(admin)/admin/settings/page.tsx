import Link from "next/link";

import { SettingsSectionForm } from "@/modules/settings/components/settings-section-form";
import { getSettingsForAdmin } from "@/modules/settings";
import { requireAdminSession } from "@/shared/auth/admin-session";
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
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Settings</h1>
        <p className="text-sm text-muted-foreground">
          Configure {session.tenantName} storefront, checkout, and payments
        </p>
      </div>

      <div className="flex flex-wrap gap-2 border-b pb-3">
        {tabs.map((item) => (
          <Link
            key={item.id}
            href={`/admin/settings?tab=${item.id}`}
            className={cn(
              "rounded-md px-3 py-1.5 text-sm",
              tab === item.id
                ? "bg-primary text-primary-foreground"
                : "bg-muted text-muted-foreground hover:bg-muted/80",
            )}
          >
            {item.label}
          </Link>
        ))}
      </div>

      <SettingsSectionForm bundle={bundle} section={tab} />
    </div>
  );
}
