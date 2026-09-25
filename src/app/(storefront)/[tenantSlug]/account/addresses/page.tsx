import { AddressBook } from "@/modules/customers/components/address-book";
import { AccountLoadError } from "@/modules/customers/components/account-load-error";
import { listCustomerAddresses, loadAccountPageSession } from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { isPrismaPoolTimeout } from "@/shared/db/prisma-errors";

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

  try {
    const addresses = await listCustomerAddresses(session.tenantId, session.customerId);
    return (
      <div className="space-y-4">
        <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          Addresses
        </h1>
        <AddressBook tenantSlug={tenantSlug} addresses={addresses} />
      </div>
    );
  } catch (error) {
    if (isPrismaPoolTimeout(error)) {
      console.error(
        JSON.stringify({
          event: "account.pool_timeout",
          tenantId: session.tenantId,
          customerId: session.customerId,
          page: "addresses",
        }),
      );
      return <AccountLoadError tenantSlug={tenantSlug} />;
    }
    throw error;
  }
}
