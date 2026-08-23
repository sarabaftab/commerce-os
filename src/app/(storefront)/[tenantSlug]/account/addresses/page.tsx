import { AddressBook } from "@/modules/customers/components/address-book";
import { listCustomerAddresses, loadAccountPageSession } from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function AccountAddressesPage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const session = await loadAccountPageSession(tenant.id);
  if (!session) {
    return null;
  }
  const addresses = await listCustomerAddresses(session.tenantId, session.customerId);

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
        Addresses
      </h1>
      <AddressBook tenantSlug={tenantSlug} addresses={addresses} />
    </div>
  );
}
