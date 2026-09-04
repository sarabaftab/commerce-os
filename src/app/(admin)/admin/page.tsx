import Link from "next/link";
import {
  ArrowUpRight,
  Package,
  Plus,
  Settings2,
  ShoppingBag,
  Sparkles,
  Users,
} from "lucide-react";

import { getProductCountsForTenant } from "@/modules/catalog";
import { CustomerTypeBadge } from "@/modules/customers/components/admin/customer-type-badge";
import { DashboardRangeSelector } from "@/modules/orders/components/admin/dashboard-range-selector";
import {
  dashboardRangeLabel,
  dashboardRangeStart,
  parseDashboardRange,
} from "@/modules/orders/dashboard-range";
import {
  getDashboardPeriodStats,
  listRecentOrdersSince,
} from "@/modules/orders/services/dashboard-stats-service";
import { formatMoney } from "@/shared/money/money";
import { formatPhoneForDisplay } from "@/shared/phone/normalize-phone";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { createTimer } from "@/shared/observability/timing";
import { prisma } from "@/shared/db/prisma";
import { TimingBadge } from "@/ui/admin/timing-badge";
import { Badge } from "@/ui/components/ui/badge";
import { buttonVariants } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";
import { STOREFRONT_BRAND } from "@/ui/storefront/brand";

const ACTIVE_ORDER_STATUSES = [
  "pending",
  "confirmed",
  "processing",
  "ready_for_pickup",
  "out_for_delivery",
] as const;

type AdminDashboardPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminDashboardPage({
  searchParams,
}: AdminDashboardPageProps) {
  const timer = createTimer("page.admin.dashboard");

  const session = await requireAdminSession();
  timer.mark("sessionMs");

  const rawParams = await searchParams;
  const range = parseDashboardRange(rawParams.range);
  const periodFrom = dashboardRangeStart(range);

  const [productCounts, periodStats, recent, orderTotal, activeOrders] = await Promise.all([
    getProductCountsForTenant(session.tenantId),
    getDashboardPeriodStats(session.tenantId, range),
    listRecentOrdersSince(session.tenantId, periodFrom, 6),
    prisma.order.count({ where: { tenantId: session.tenantId } }),
    prisma.order.count({
      where: {
        tenantId: session.tenantId,
        status: { in: [...ACTIVE_ORDER_STATUSES] },
      },
    }),
  ]);

  timer.mark("dataMs");

  const timings = timer.log({
    productCount: productCounts.total,
    orderCount: orderTotal,
  });
  const availableCount = productCounts.available;
  const unavailableCount = productCounts.total - productCounts.available;
  const rangeLabel = dashboardRangeLabel(range);

  return (
    <div className="space-y-8">
      <TimingBadge
        route="/admin"
        timings={{
          session: Number(timings.sessionMs ?? 0),
          products: Number(timings.dataMs ?? 0) - Number(timings.sessionMs ?? 0),
          total: Number(timings.totalMs ?? 0),
        }}
      />

      <section className="relative overflow-hidden rounded-[1.75rem] border border-[color:var(--admin-line)] bg-[color:var(--admin-ink)] px-5 py-7 text-white sm:px-8 sm:py-8">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0 opacity-55"
          style={{
            background:
              "radial-gradient(circle at 90% 10%, rgba(249,220,92,0.5), transparent 40%), linear-gradient(135deg, transparent 40%, rgba(250,229,136,0.2))",
          }}
        />
        <div className="relative flex flex-col gap-6 sm:flex-row sm:items-end sm:justify-between">
          <div className="max-w-xl space-y-3">
            <p className="inline-flex items-center gap-1.5 text-[11px] font-medium tracking-[0.18em] text-[color:var(--admin-accent)] uppercase">
              <Sparkles className="size-3.5" />
              {STOREFRONT_BRAND.name}
            </p>
            <h1 className="font-[family-name:var(--font-admin-display)] text-3xl leading-tight tracking-tight sm:text-4xl">
              Welcome back
            </h1>
            <p className="text-sm leading-relaxed text-white/70">
              {session.tenantName} operations — orders, catalog, and settings in one
              place.
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/orders"
              className={cn(
                buttonVariants({ size: "lg" }),
                "rounded-full bg-[color:var(--admin-primary)] text-[color:var(--admin-on-primary)] hover:bg-[color:var(--admin-accent)]",
              )}
            >
              View orders
              <ArrowUpRight className="size-4" />
            </Link>
            <Link
              href="/admin/products/new"
              className={cn(
                buttonVariants({ variant: "outline", size: "lg" }),
                "rounded-full border-white/20 bg-white/5 text-white hover:bg-white/10 hover:text-white",
              )}
            >
              <Plus className="size-4" />
              New product
            </Link>
          </div>
        </div>
      </section>

      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-sm text-[color:var(--admin-ink-muted)]">
          Activity for <span className="font-medium text-[color:var(--admin-ink)]">{rangeLabel}</span>
        </p>
        <DashboardRangeSelector range={range} />
      </div>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <MetricCard
          label="Orders"
          value={String(periodStats.ordersInPeriod)}
          hint={`${rangeLabel} · ${orderTotal} all-time`}
          href="/admin/orders"
          icon={<ShoppingBag className="size-4" />}
        />
        <MetricCard
          label="New customers"
          value={String(periodStats.newCustomersInPeriod)}
          hint={`First order in ${rangeLabel.toLowerCase()}`}
          href="/admin/customers"
          icon={<Users className="size-4" />}
        />
        <MetricCard
          label="Returning customers"
          value={String(periodStats.returningCustomersInPeriod)}
          hint={`Ordered again in ${rangeLabel.toLowerCase()}`}
          href="/admin/customers"
          icon={<Users className="size-4" />}
        />
        <MetricCard
          label="Active orders"
          value={String(activeOrders)}
          hint="Open pipeline (all-time)"
          href="/admin/orders"
          icon={<ShoppingBag className="size-4" />}
        />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <MetricCard
          label="Products"
          value={String(productCounts.total)}
          hint={`${availableCount} available`}
          href="/admin/products"
          icon={<Package className="size-4" />}
        />
        <MetricCard
          label="Unavailable"
          value={String(unavailableCount)}
          hint="Hidden from storefront"
          href="/admin/products"
          icon={<Package className="size-4 opacity-60" />}
        />
        <MetricCard
          label="Currency"
          value={session.tenantCurrency}
          hint="Tenant default"
          href="/admin/settings"
          icon={<Settings2 className="size-4" />}
        />
      </section>

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
              className={cn(
                buttonVariants({ variant: "ghost", size: "sm" }),
                "rounded-full",
              )}
            >
              All orders
              <ArrowUpRight className="size-3.5" />
            </Link>
          </div>

          {recent.items.length === 0 ? (
            <div className="px-5 py-12 text-center text-sm text-[color:var(--admin-ink-muted)]">
              No orders in this period.
            </div>
          ) : (
            <ul className="divide-y divide-[color:var(--admin-line)]">
              {recent.items.map((order) => (
                <li key={order.id}>
                  <Link
                    href={`/admin/orders/${order.id}`}
                    className="flex items-center justify-between gap-4 px-5 py-3.5 transition hover:bg-[color:var(--admin-surface)]/40"
                  >
                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-medium">{order.orderNumber}</span>
                        <Badge
                          variant="secondary"
                          className="rounded-full capitalize"
                        >
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
                        {order.placedAt.toLocaleString()}
                      </p>
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="space-y-3">
          <h2 className="px-1 font-[family-name:var(--font-admin-display)] text-lg tracking-tight">
            Quick actions
          </h2>
          <QuickAction
            href="/admin/orders"
            title="Fulfill orders"
            description="Update status and track delivery or pickup"
          />
          <QuickAction
            href="/admin/products"
            title="Manage catalog"
            description="Edit prices, availability, and product details"
          />
          <QuickAction
            href="/admin/products/new"
            title="Add a product"
            description="Create a new item for the storefront"
          />
          <QuickAction
            href="/admin/faqs"
            title="Manage FAQs"
            description="Customer questions for the storefront and Telegram"
          />
          <QuickAction
            href="/admin/settings"
            title="Store settings"
            description="Delivery, pickup, and payment options"
          />
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

function QuickAction({
  href,
  title,
  description,
}: {
  href: string;
  title: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="block rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] px-4 py-3.5 shadow-[var(--admin-shadow)] transition hover:bg-[color:var(--admin-surface)]/50"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-medium">{title}</p>
          <p className="mt-0.5 text-xs text-[color:var(--admin-ink-muted)]">
            {description}
          </p>
        </div>
        <ArrowUpRight className="mt-0.5 size-4 shrink-0 text-[color:var(--admin-ink-muted)]" />
      </div>
    </Link>
  );
}
