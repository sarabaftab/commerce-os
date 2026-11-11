import { ProfileForm } from "@/modules/customers/components/profile-form";
import { AccountLoadError } from "@/modules/customers/components/account-load-error";
import { getCustomerProfile, loadAccountPageSession } from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { isPrismaPoolTimeout } from "@/shared/db/prisma-errors";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function AccountProfilePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const session = await loadAccountPageSession(tenant.id);
  if (!session) {
    return null;
  }

  try {
    const profile = await getCustomerProfile(session.tenantId, session.customerId);
    return (
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          Profile
        </h1>
        <div className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
          <ProfileForm tenantSlug={tenantSlug} profile={profile} />
        </div>
      </div>
    );
  } catch (error) {
    if (isPrismaPoolTimeout(error)) {
      console.error(
        JSON.stringify({
          event: "account.pool_timeout",
          tenantId: session.tenantId,
          customerId: session.customerId,
          page: "profile",
        }),
      );
      return <AccountLoadError tenantSlug={tenantSlug} />;
    }
    throw error;
  }
}
