import Link from "next/link";
import { ArrowUpRight, Plus, Sparkles } from "lucide-react";

import { DashboardLiveSections } from "@/modules/orders/components/admin/dashboard-live-sections";
import { DashboardRangeSelector } from "@/modules/orders/components/admin/dashboard-range-selector";
import {
  dashboardWindowKey,
  resolveDashboardWindow,
} from "@/modules/orders/dashboard-range";
import { getAdminDashboardLiveSnapshot } from "@/modules/orders/services/dashboard-stats-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { createTimer } from "@/shared/observability/timing";
import { TimingBadge } from "@/ui/admin/timing-badge";
import { buttonVariants } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";
import { STOREFRONT_BRAND } from "@/ui/storefront/brand";

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
  const window = resolveDashboardWindow({
    range: rawParams.range,
    from: rawParams.from,
    to: rawParams.to,
  });

  const liveSnapshot = await getAdminDashboardLiveSnapshot(session.tenantId, window);

  timer.mark("dataMs");

  const timings = timer.log({
    orderCount: liveSnapshot.ordersAllTime,
  });

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

      <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
        <p className="text-sm text-[color:var(--admin-ink-muted)]">
          Activity for{" "}
          <span className="font-medium text-[color:var(--admin-ink)]">{window.label}</span>
        </p>
        <DashboardRangeSelector window={window} />
      </div>

      <DashboardLiveSections
        key={dashboardWindowKey(window)}
        window={window}
        initial={liveSnapshot}
        aside={
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
        }
      />
    </div>
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
