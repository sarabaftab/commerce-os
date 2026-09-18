import {
  getCustomerProfile,
  listCustomerAddresses,
  listCustomerOrders,
  loadAccountPageSession,
} from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { LocalizedAccountHome } from "@/ui/storefront/localized-text";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function AccountHomePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const session = await loadAccountPageSession(tenant.id);
  if (!session) {
    return null;
  }
  const [profile, addresses, orders] = await Promise.all([
    getCustomerProfile(session.tenantId, session.customerId),
    listCustomerAddresses(session.tenantId, session.customerId),
    listCustomerOrders({
      tenantId: session.tenantId,
      customerId: session.customerId,
      pageSize: 3,
    }),
  ]);

  const base = `/${tenantSlug}/account`;
  const displayName =
    profile.displayName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    profile.phone ||
    "Account";

  return (
    <LocalizedAccountHome
      displayName={displayName}
      profileHref={`${base}/profile`}
      addressesHref={`${base}/addresses`}
      ordersHref={`${base}/orders`}
      faqHref={`/${tenantSlug}/faq`}
      addressesCount={addresses.length}
      defaultAddressLabel={addresses.find((a) => a.isDefault)?.label ?? null}
      ordersTotal={orders.total}
    />
  );
}
