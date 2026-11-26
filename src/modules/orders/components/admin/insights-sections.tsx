import Link from "next/link";
import {
  CircleDollarSign,
  MessageSquareHeart,
  ShoppingBag,
  Users,
} from "lucide-react";

import type { AdminInsightsSnapshot } from "@/modules/orders/services/insights-stats-service";
import { formatMoney } from "@/shared/money/money";
import { cn } from "@/ui/lib/utils";

type InsightsSectionsProps = {
  data: AdminInsightsSnapshot;
};

export function InsightsSections({ data }: InsightsSectionsProps) {
  const maxTrend = Math.max(0, ...data.trend.map((point) => point.salesMinor));

  return (
    <div className="space-y-6">
      <p className="text-xs text-[color:var(--admin-ink-muted)]">
        {data.window.rangeLabel} · Asia/Phnom_Penh · {data.salesDefinition}
      </p>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-5">
        <MetricCard
          label="Total Sales"
          value={formatMoney(data.totalSalesMinor, data.currency)}
          hint={`${data.eligibleOrderCount} eligible orders`}
          href="/admin/orders"
          icon={<CircleDollarSign className="size-4" />}
        />
        <MetricCard
          label="Total Orders"
          value={String(data.totalOrders)}
          hint="All placed orders in range"
          href="/admin/orders"
          icon={<ShoppingBag className="size-4" />}
        />
        <MetricCard
          label="Avg Order Value"
          value={
            data.averageOrderValueMinor != null
              ? formatMoney(data.averageOrderValueMinor, data.currency)
              : "—"
          }
          hint="Eligible sales ÷ eligible orders"
          href="/admin/orders"
          icon={<CircleDollarSign className="size-4" />}
        />
        <MetricCard
          label="New Customers"
          value={String(data.newCustomers)}
          hint="First order in this period"
          href="/admin/customers"
          icon={<Users className="size-4" />}
        />
        <MetricCard
          label="Returning Customers"
          value={String(data.returningCustomers)}
          hint="Ordered again in this period"
          href="/admin/customers"
          icon={<Users className="size-4" />}
        />
      </section>

      <section className="grid gap-6 lg:grid-cols-[1.4fr_0.8fr]">
        <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
          <div className="border-b border-[color:var(--admin-line)] px-5 py-4">
            <h2 className="font-[family-name:var(--font-admin-display)] text-lg tracking-tight">
              Sales trend
            </h2>
            <p className="mt-1 text-xs text-[color:var(--admin-ink-muted)]">
              {data.window.trendGrain === "day" ? "Daily" : "Weekly"} eligible sales
            </p>
          </div>
          <div className="px-5 py-5">
            {data.trend.length === 0 || maxTrend === 0 ? (
              <p className="py-8 text-center text-sm text-[color:var(--admin-ink-muted)]">
                No eligible sales in this period.
              </p>
            ) : (
              <div className="flex h-40 items-end gap-1.5 sm:gap-2">
                {data.trend.map((point) => {
                  const heightPct =
                    maxTrend > 0 ? Math.max(4, (point.salesMinor / maxTrend) * 100) : 0;
                  return (
                    <div
                      key={point.key}
                      className="flex min-w-0 flex-1 flex-col items-center gap-1"
                      title={`${point.label}: ${formatMoney(point.salesMinor, data.currency)}`}
                    >
                      <div
                        className="w-full rounded-t-md bg-[color:var(--admin-primary)]/85"
                        style={{ height: `${heightPct}%` }}
                      />
                      <span className="w-full truncate text-center text-[10px] text-[color:var(--admin-ink-muted)]">
                        {point.key.slice(5)}
                      </span>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
            <div className="border-b border-[color:var(--admin-line)] px-5 py-4">
              <h2 className="font-[family-name:var(--font-admin-display)] text-lg tracking-tight">
                Customer sources
              </h2>
              <p className="mt-1 text-xs text-[color:var(--admin-ink-muted)]">
                Unique customers with a non-cancelled order in range
              </p>
            </div>
            <div className="px-5 py-4">
              {data.sources.length === 0 ? (
                <p className="py-6 text-center text-sm text-[color:var(--admin-ink-muted)]">
                  No customers ordered in this period.
                </p>
              ) : (
                <ul className="space-y-3">
                  {data.sources.map((source) => {
                    const total = data.sources.reduce((sum, row) => sum + row.count, 0) || 1;
                    const pct = Math.round((source.count / total) * 100);
                    return (
                      <li key={source.label} className="space-y-1">
                        <div className="flex items-center justify-between gap-2 text-sm">
                          <span>{source.label}</span>
                          <span className="tabular-nums text-[color:var(--admin-ink-muted)]">
                            {source.count} · {pct}%
                          </span>
                        </div>
                        <div className="h-1.5 overflow-hidden rounded-full bg-[color:var(--admin-surface)]">
                          <div
                            className="h-full rounded-full bg-[color:var(--admin-primary)]"
                            style={{ width: `${pct}%` }}
                          />
                        </div>
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
            <div className="flex items-center justify-between gap-3 border-b border-[color:var(--admin-line)] px-5 py-4">
              <div>
                <h2 className="font-[family-name:var(--font-admin-display)] text-lg tracking-tight">
                  Customer feedback
                </h2>
                <p className="mt-1 text-xs text-[color:var(--admin-ink-muted)]">
                  By feedback submission date
                </p>
              </div>
              <MessageSquareHeart className="size-4 text-[color:var(--admin-ink-muted)]" />
            </div>
            <div className="space-y-2 px-5 py-4 text-sm">
              <p>
                Average rating{" "}
                <span className="font-semibold tabular-nums">
                  {data.averageRating != null ? `${data.averageRating} / 5` : "—"}
                </span>
              </p>
              <p className="text-[color:var(--admin-ink-muted)]">
                {data.feedbackCount}{" "}
                {data.feedbackCount === 1 ? "submission" : "submissions"}
              </p>
              <Link
                href="/admin/feedback"
                className="inline-flex text-xs font-medium underline-offset-4 hover:underline"
              >
                View all feedback
              </Link>
            </div>
          </div>
        </div>
      </section>
    </div>
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
      className={cn(
        "group rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] p-4 shadow-[var(--admin-shadow)] transition hover:-translate-y-0.5 hover:border-[color:var(--admin-primary)]",
      )}
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
