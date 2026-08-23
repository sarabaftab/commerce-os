import { CustomerOrderList } from "@/modules/customers/components/customer-order-list";
import {
  listCustomerOrders,
  loadAccountPageSession,
  type CustomerOrderListFilter,
} from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
  searchParams: Promise<{ filter?: string; page?: string }>;
};

function parseFilter(value: string | undefined): CustomerOrderListFilter {
  if (value === "active" || value === "completed" || value === "cancelled") {
    return value;
  }
  return "all";
}

export default async function AccountOrdersPage({ params, searchParams }: PageProps) {
  const { tenantSlug } = await params;
  const query = await searchParams;
  const filter = parseFilter(query.filter);
  const page = Number(query.page ?? "1") || 1;

  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const session = await loadAccountPageSession(tenant.id);
  if (!session) {
    return null;
  }
  const result = await listCustomerOrders({
    tenantId: session.tenantId,
    customerId: session.customerId,
    filter,
    page,
  });

  return (
    <div className="space-y-4">
      <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
        My orders
      </h1>
      <CustomerOrderList tenantSlug={tenantSlug} result={result} filter={filter} />
    </div>
  );
}
