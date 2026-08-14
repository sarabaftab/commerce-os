import { ProfileForm } from "@/modules/customers/components/profile-form";
import { getCustomerProfile, requireCustomerSession } from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function AccountProfilePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const session = await requireCustomerSession(tenant.id);
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
}
