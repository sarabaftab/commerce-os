import Link from "next/link";

import { OrderListFilters } from "@/modules/orders/components/admin/order-list-filters";
import { OrderListPagination } from "@/modules/orders/components/admin/order-list-pagination";
import { OrderListTable } from "@/modules/orders/components/admin/order-list-table";
import { parseOrderAdminListSearchParams } from "@/modules/orders/schemas/order-admin";
import { listOrdersForAdminTenant } from "@/modules/orders/services/order-admin-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { createTimer } from "@/shared/observability/timing";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";
import { TimingBadge } from "@/ui/admin/timing-badge";

type AdminOrdersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminOrdersPage({ searchParams }: AdminOrdersPageProps) {
  const timer = createTimer("page.admin.orders");
  const session = await requireAdminSession();
  timer.mark("sessionMs");

  const rawParams = await searchParams;
  const query = parseOrderAdminListSearchParams(rawParams);
  const result = await listOrdersForAdminTenant(session.tenantId, query);
  timer.mark("ordersMs");

  const timings = timer.log({ orderCount: result.total });

  const paginationParams: Record<string, string> = {};
  for (const [key, value] of Object.entries(rawParams)) {
    if (typeof value === "string" && value && key !== "page") {
      paginationParams[key] = value;
    }
  }

  return (
    <div className="space-y-6">
      <TimingBadge
        route="/admin/orders"
        timings={{
          session: Number(timings.sessionMs ?? 0),
          orders: Number(timings.ordersMs ?? 0) - Number(timings.sessionMs ?? 0),
          total: Number(timings.totalMs ?? 0),
        }}
      />

      <AdminPageHeader
        title="Orders"
        description={`Manage fulfillment for ${session.tenantName}`}
      />

      <div className="rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] p-4 shadow-[var(--admin-shadow)] sm:p-5">
        <OrderListFilters query={query} />
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
        <OrderListTable orders={result.items} />
      </div>

      <OrderListPagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        searchParams={paginationParams}
      />

      <p className="text-xs text-[color:var(--admin-ink-muted)]">
        Tip: open an order to update status.{" "}
        <Link
          href="/admin"
          className="font-medium text-[color:var(--admin-ink)] underline decoration-[color:var(--admin-primary)] underline-offset-4"
        >
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
