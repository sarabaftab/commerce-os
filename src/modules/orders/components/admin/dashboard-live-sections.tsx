"use client";

import Link from "next/link";
import { useEffect, useRef, useState, type ReactNode } from "react";
import { ArrowUpRight, ShoppingBag, Users } from "lucide-react";

import { CustomerTypeBadge } from "@/modules/customers/components/admin/customer-type-badge";
import type { DashboardRangeDays } from "@/modules/orders/dashboard-range";
import { DASHBOARD_POLL_INTERVAL_MS } from "@/modules/orders/dashboard-live";
import type { AdminDashboardLiveSnapshot } from "@/modules/orders/services/dashboard-stats-service";
import { formatMoney } from "@/shared/money/money";
import { formatPhoneForDisplay } from "@/shared/phone/normalize-phone";
import { Badge } from "@/ui/components/ui/badge";
import { buttonVariants } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

export { DASHBOARD_POLL_INTERVAL_MS } from "@/modules/orders/dashboard-live";

type DashboardLiveSectionsProps = {
  range: DashboardRangeDays;
  initial: AdminDashboardLiveSnapshot;
  /** Catalog/static metrics between period cards and recent orders. */
  middle: ReactNode;
  /** Right-column content (quick actions) beside Recent orders. */
  aside: ReactNode;
};

export function DashboardLiveSections({
  range,
  initial,
  middle,
  aside,
}: DashboardLiveSectionsProps) {
  const [data, setData] = useState(initial);
  const [highlightIds, setHighlightIds] = useState<Set<string>>(() => new Set());
  const [updatedLabel, setUpdatedLabel] = useState<string | null>(null);
  const knownIdsRef = useRef(new Set(initial.recent.map((order) => order.id)));
  const inFlightRef = useRef(false);

  useEffect(() => {
    let cancelled = false;
    let highlightTimer: ReturnType<typeof setTimeout> | undefined;

    const applySnapshot = (next: AdminDashboardLiveSnapshot) => {
      const previousIds = knownIdsRef.current;
      const freshIds = next.recent
        .map((order) => order.id)
        .filter((id) => !previousIds.has(id));
      knownIdsRef.current = new Set(next.recent.map((order) => order.id));
      setData(next);
      setUpdatedLabel("Updated just now");
      if (freshIds.length > 0) {
        setHighlightIds(new Set(freshIds));
        clearTimeout(highlightTimer);
        highlightTimer = setTimeout(() => setHighlightIds(new Set()), 2500);
      }
    };

    const refresh = async () => {
      if (cancelled || inFlightRef.current) {
        return;
      }
      if (typeof document !== "undefined" && document.visibilityState === "hidden") {
        return;
      }

      inFlightRef.current = true;
      try {
        const response = await fetch(`/api/admin/dashboard?range=${range}`, {
          credentials: "same-origin",
          headers: { Accept: "application/json" },
          cache: "no-store",
        });
        if (!response.ok) {
          return;
        }
        const payload = (await response.json()) as { data?: AdminDashboardLiveSnapshot };
        if (!cancelled && payload.data) {
          applySnapshot(payload.data);
        }
      } catch {
        // Keep existing UI; retry on the next interval.
      } finally {
        inFlightRef.current = false;
      }
    };

    const intervalId = setInterval(() => {
      void refresh();
    }, DASHBOARD_POLL_INTERVAL_MS);

    const onVisibility = () => {
      if (document.visibilityState === "visible") {
        void refresh();
      }
    };
    document.addEventListener("visibilitychange", onVisibility);

    return () => {
      cancelled = true;
      clearInterval(intervalId);
      clearTimeout(highlightTimer);
      document.removeEventListener("visibilitychange", onVisibility);
    };
  }, [range]);

  const rangeLabel = data.rangeLabel;

  return (
    <>
      <p className="text-right text-[11px] text-[color:var(--admin-ink-muted)]" aria-live="polite">
        {updatedLabel ?? "Auto-updates while this page is open"}
      </p>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Orders"
          value={String(data.ordersInPeriod)}
          hint={`${rangeLabel} · ${data.ordersAllTime} all-time`}
          href="/admin/orders"
          icon={<ShoppingBag className="size-4" />}
        />
        <MetricCard
          label="New customers"
          value={String(data.newCustomersInPeriod)}
          hint={`First order in ${rangeLabel.toLowerCase()}`}
          href="/admin/customers"
          icon={<Users className="size-4" />}
        />
        <MetricCard
          label="Returning customers"
          value={String(data.returningCustomersInPeriod)}
          hint={`Ordered again in ${rangeLabel.toLowerCase()}`}
          href="/admin/customers"
          icon={<Users className="size-4" />}
        />
        <MetricCard
          label="Active orders"
          value={String(data.activeOrders)}
          hint="Open pipeline (all-time)"
          href="/admin/orders"
          icon={<ShoppingBag className="size-4" />}
        />
      </section>

      {middle}

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
          <div className="flex items-center justify-between gap-3 border-b border-[color:var(--admin-line)] px-5 py-4">
            <div>
              <h2 className="font-[family-name:var(--font-admin-display)] text-lg tracking-tight">
                Recent orders
              </h2>
              <p className="text-xs text-[color:var(--admin-ink-muted)]">
                Latest activity in {rangeLabel.toLowerCase()}
              </p>
            </div>
            <Link
              href="/admin/orders"
              className={cn(buttonVariants({ variant: "ghost", size: "sm" }), "rounded-full")}
            >
              All orders
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {data.recent.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[color:var(--admin-ink-muted)]">
              No orders in this period.
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--admin-line)]">
              {data.recent.map((order) => (
                <li
                  key={order.id}
                  className={cn(
                    highlightIds.has(order.id) &&
                      "bg-[color:var(--admin-accent)]/15 transition-colors duration-500",
                  )}
                >
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-[color:var(--admin-surface)]/40"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{order.orderNumber}</span>
                        <Badge variant="secondary" className="rounded-full capitalize">
                          {order.status.replaceAll("_", " ")}
                        </Badge>
                        <CustomerTypeBadge type={order.customerType} />
                      </div>
                      <p className="mt-1 truncate text-xs text-[color:var(--admin-ink-muted)]">
                        {order.customer.displayName ?? "Customer"}
                        {order.customer.phone
                          ? ` · ${formatPhoneForDisplay(order.customer.phone)}`
                          : ""}
                      </p>
                    </div>
                    <div className="shrink-0 text-right">
                      <p className="text-sm font-semibold">
                        {formatMoney(order.totalMinor, order.currency)}
                      </p>
                      <p className="text-[11px] text-[color:var(--admin-ink-muted)]">
                        {new Date(order.placedAt).toLocaleString()}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        {aside}
      </section>
    </>
  );
}

function MetricCard({
  label,
  value,
  hint,
  href,
  icon,
}: {
  label: string;
  value: string;
  hint: string;
  href: string;
  icon: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      className="group rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] p-4 shadow-[var(--admin-shadow)] transition hover:-translate-y-0.5 hover:border-[color:var(--admin-primary)]"
    >
      <div className="flex items-center justify-between gap-3">
        <p className="text-xs font-medium tracking-wide text-[color:var(--admin-ink-muted)] uppercase">
          {label}
        </p>
        <span className="rounded-full bg-[color:var(--admin-surface)] p-2 text-[color:var(--admin-ink)]">
          {icon}
        </span>
      </div>
      <p className="mt-3 font-[family-name:var(--font-admin-display)] text-3xl tracking-tight">
        {value}
      </p>
      <p className="mt-1 text-xs text-[color:var(--admin-ink-muted)] group-hover:text-[color:var(--admin-ink)]">
        {hint}
      </p>
    </Link>
  );
}
