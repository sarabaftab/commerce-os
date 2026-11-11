import { cookies } from "next/headers";

import { CUSTOMER_SESSION_COOKIE } from "@/channels/telegram/server/customer-session";
import { AccountAccessSync } from "@/modules/customers/components/account-access-sync";
import { AccountAuthGate } from "@/modules/customers/components/account-auth-gate";
import { AccountNav } from "@/modules/customers/components/account-nav";
import { getOptionalCustomerSession } from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";

export const dynamic = "force-dynamic";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
};

export default async function AccountLayout({ children, params }: LayoutProps) {
  const { tenantSlug } = await params;
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const cookieStore = await cookies();
  const customerSessionCookiePresent = Boolean(
    cookieStore.get(CUSTOMER_SESSION_COOKIE)?.value?.trim(),
  );
  const session = await getOptionalCustomerSession(tenant.id);

  console.info(
    JSON.stringify({
      event: "account.session_resolve",
      tenantId: tenant.id,
      tenantSlug,
      customerSessionCookiePresent,
      sessionResolved: Boolean(session),
      resolvedVia: session?.resolvedVia ?? null,
      customerId: session?.customerId ?? null,
    }),
  );

  if (!session) {
    return <AccountAuthGate tenantSlug={tenantSlug} />;
  }

  return (
    <div className="space-y-5 pt-4">
      <AccountAccessSync />
      <AccountNav tenantSlug={tenantSlug} />
      {children}
    </div>
  );
}
