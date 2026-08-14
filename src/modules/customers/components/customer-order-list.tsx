import Link from "next/link";

import { formatMoney } from "@/shared/money/money";
import { ProductImage } from "@/ui/storefront/product-image";

import type { CustomerOrderListItemDto, CustomerOrderListResult } from "../types";

type OrderListProps = {
  tenantSlug: string;
  result: CustomerOrderListResult;
  filter: string;
};

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "completed", label: "Completed" },
  { key: "cancelled", label: "Cancelled" },
] as const;

export function CustomerOrderList({ tenantSlug, result, filter }: OrderListProps) {
  const base = `/${tenantSlug}/account/orders`;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-1" role="tablist" aria-label="Order filters">
        {FILTERS.map((f) => (
          <Link
            key={f.key}
            href={f.key === "all" ? base : `${base}?filter=${f.key}`}
            className={
              filter === f.key
                ? "rounded-full bg-[color:var(--shop-primary)] px-3 py-1.5 text-xs font-medium text-[color:var(--shop-on-primary)]"
                : "rounded-full px-3 py-1.5 text-xs text-[color:var(--shop-ink-muted)] ring-1 ring-[color:var(--shop-line)]"
            }
          >
            {f.label}
          </Link>
        ))}
      </div>

      {result.items.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-[color:var(--shop-line)] bg-[color:var(--shop-surface)]/50 px-4 py-12 text-center text-sm text-[color:var(--shop-ink-muted)]">
          No orders yet.
        </div>
      ) : (
        <ul className="space-y-3">
          {result.items.map((order) => (
            <OrderCard key={order.orderNumber} tenantSlug={tenantSlug} order={order} />
          ))}
        </ul>
      )}

      {result.totalPages > 1 ? (
        <div className="flex items-center justify-between text-sm">
          <span className="text-[color:var(--shop-ink-muted)]">
            Page {result.page} of {result.totalPages}
          </span>
          <div className="flex gap-2">
            {result.page > 1 ? (
              <Link
                href={`${base}?filter=${filter}&page=${result.page - 1}`}
                className="rounded-full px-3 py-1.5 ring-1 ring-[color:var(--shop-line)]"
              >
                Previous
              </Link>
            ) : null}
            {result.page < result.totalPages ? (
              <Link
                href={`${base}?filter=${filter}&page=${result.page + 1}`}
                className="rounded-full px-3 py-1.5 ring-1 ring-[color:var(--shop-line)]"
              >
                Next
              </Link>
            ) : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function OrderCard({
  tenantSlug,
  order,
}: {
  tenantSlug: string;
  order: CustomerOrderListItemDto;
}) {
  return (
    <li className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
      <div className="flex gap-3">
        {order.thumbnailUrl ? (
          <div className="relative h-14 w-14 shrink-0 overflow-hidden rounded-xl">
            <ProductImage
              src={order.thumbnailUrl}
              alt=""
              sizes="56px"
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[color:var(--shop-line)]/40 text-xs text-[color:var(--shop-ink-muted)]">
            Order
          </div>
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-sm font-semibold">{order.orderNumber}</p>
              <p className="text-xs text-[color:var(--shop-ink-muted)]">
                {order.placedAt.toLocaleString()}
              </p>
            </div>
            <span className="rounded-full bg-black/5 px-2 py-0.5 text-[11px] font-medium">
              {order.statusLabel}
            </span>
          </div>
          <p className="mt-1 truncate text-sm text-[color:var(--shop-ink-muted)]">
            {order.itemSummary || `${order.itemCount} items`}
          </p>
          <div className="mt-2 flex items-center justify-between">
            <p className="text-sm font-semibold">
              {formatMoney(order.totalMinor, order.currency)}
            </p>
            <Link
              href={`/${tenantSlug}/account/orders/${order.orderNumber}`}
              className="text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
            >
              View order
            </Link>
          </div>
        </div>
      </div>
    </li>
  );
}
