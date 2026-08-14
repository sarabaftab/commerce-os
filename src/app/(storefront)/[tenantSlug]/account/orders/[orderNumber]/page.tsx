import { CustomerOrderDetail } from "@/modules/customers/components/customer-order-detail";
import { getCustomerOrderByNumber, requireCustomerSession } from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tenantSlug: string; orderNumber: string }>;
};

export default async function AccountOrderDetailPage({ params }: PageProps) {
  const { tenantSlug, orderNumber } = await params;
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const session = await requireCustomerSession(tenant.id);
  const order = await getCustomerOrderByNumber({
    tenantId: session.tenantId,
    customerId: session.customerId,
    tenantSlug: tenant.slug,
    orderNumber,
  });

  return <CustomerOrderDetail tenantSlug={tenantSlug} order={order} />;
}
