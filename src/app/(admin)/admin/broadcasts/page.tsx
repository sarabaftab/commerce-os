import { BroadcastForm } from "@/modules/broadcasts/components/broadcast-form";
import { getBroadcastChannelForAdmin } from "@/modules/broadcasts/services/broadcast-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { env } from "@/shared/config/env";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";

export default async function AdminBroadcastsPage() {
  const session = await requireAdminSession();
  const channel = getBroadcastChannelForAdmin(session.tenantSlug);
  const defaultStoreUrl = `${env().NEXT_PUBLIC_APP_URL.replace(/\/$/, "")}/${session.tenantSlug}`;

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Telegram Broadcast"
        description="Publish an announcement, product update, or promotion to the Telegram channel."
      />

      {!channel ? (
        <div className="rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] p-5 text-sm text-[color:var(--admin-ink-muted)] shadow-[var(--admin-shadow)]">
          Telegram broadcasts are not configured for this tenant. Set{" "}
          <code className="text-[color:var(--admin-ink)]">TELEGRAM_BROADCAST_CHANNEL</code> and
          ensure the bot token is mapped to this storefront slug.
        </div>
      ) : (
        <BroadcastForm channel={channel} defaultStoreUrl={defaultStoreUrl} />
      )}
    </div>
  );
}
