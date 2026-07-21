import Link from "next/link";

import { OrderListFilters } from "@/modules/orders/components/admin/order-list-filters";
import { OrderListPagination } from "@/modules/orders/components/admin/order-list-pagination";
import { OrderListTable } from "@/modules/orders/components/admin/order-list-table";
import { parseOrderAdminListSearchParams } from "@/modules/orders/schemas/order-admin";
import { listOrdersForAdminTenant } from "@/modules/orders/services/order-admin-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { createTimer } from "@/shared/observability/timing";
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

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Orders</h1>
        <p className="text-sm text-muted-foreground">
          Manage fulfillment for {session.tenantName}
        </p>
      </div>

      <OrderListFilters query={query} />
      <OrderListTable orders={result.items} />
      <OrderListPagination
        page={result.page}
        totalPages={result.totalPages}
        total={result.total}
        searchParams={paginationParams}
      />

      <p className="text-xs text-muted-foreground">
        Tip: open an order to update status.{" "}
        <Link href="/admin" className="underline-offset-4 hover:underline">
          Back to dashboard
        </Link>
      </p>
    </div>
  );
}
