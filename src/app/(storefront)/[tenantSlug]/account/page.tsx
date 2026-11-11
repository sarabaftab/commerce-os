import { AccountLoadError } from "@/modules/customers/components/account-load-error";
import {
  getCustomerProfile,
  listCustomerAddresses,
  listCustomerOrders,
  loadAccountPageSession,
} from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { isPrismaPoolTimeout } from "@/shared/db/prisma-errors";
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

  try {
    // Sequential on purpose: Vercel Prisma uses connection_limit=1. Parallel
    // Account queries + Next.js link prefetch previously caused P2024 crashes.
    const profile = await getCustomerProfile(session.tenantId, session.customerId);
    const addresses = await listCustomerAddresses(session.tenantId, session.customerId);
    const orders = await listCustomerOrders({
      tenantId: session.tenantId,
      customerId: session.customerId,
      pageSize: 3,
    });

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
  } catch (error) {
    if (isPrismaPoolTimeout(error)) {
      console.error(
        JSON.stringify({
          event: "account.pool_timeout",
          tenantId: session.tenantId,
          customerId: session.customerId,
          page: "home",
        }),
      );
      return <AccountLoadError tenantSlug={tenantSlug} />;
    }
    throw error;
  }
}
