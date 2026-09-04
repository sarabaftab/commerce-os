import Link from "next/link";

import {
  DASHBOARD_RANGES,
  dashboardRangeLabel,
  type DashboardRangeDays,
} from "@/modules/orders/dashboard-range";
import { cn } from "@/ui/lib/utils";

type DashboardRangeSelectorProps = {
  range: DashboardRangeDays;
};

export function DashboardRangeSelector({ range }: DashboardRangeSelectorProps) {
  return (
    <div
      className="inline-flex flex-wrap gap-1 rounded-full border border-[color:var(--admin-line)] bg-[color:var(--admin-surface)] p-1"
      role="group"
      aria-label="Dashboard date range"
    >
      {DASHBOARD_RANGES.map((days) => {
        const active = days === range;
        return (
          <Link
            key={days}
            href={days === 7 ? "/admin" : `/admin?range=${days}`}
            className={cn(
              "rounded-full px-3 py-1.5 text-xs font-medium transition",
              active
                ? "bg-[color:var(--admin-primary)] text-[color:var(--admin-on-primary)] shadow-sm"
                : "text-[color:var(--admin-ink-muted)] hover:bg-[color:var(--admin-surface-elevated)] hover:text-[color:var(--admin-ink)]",
            )}
            aria-current={active ? "true" : undefined}
          >
            {dashboardRangeLabel(days)}
          </Link>
        );
      })}
    </div>
  );
}
