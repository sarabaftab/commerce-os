import { redirect } from "next/navigation";

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
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  const session = await getOptionalCustomerSession(tenant.id);

  if (!session) {
    redirect(basePath);
  }

  return (
    <div className="space-y-5 pt-4">
      <AccountNav tenantSlug={tenantSlug} />
      {children}
    </div>
  );
}
