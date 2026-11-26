import Link from "next/link";

import type { InsightsWindow } from "@/modules/orders/insights-range";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { cn } from "@/ui/lib/utils";

type InsightsRangeSelectorProps = {
  window: InsightsWindow;
};

export function InsightsRangeSelector({ window }: InsightsRangeSelectorProps) {
  return (
    <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
      <div
        className="inline-flex flex-wrap gap-1 rounded-full border border-[color:var(--admin-line)] bg-[color:var(--admin-surface)] p-1"
        role="group"
        aria-label="Insights date range"
      >
        {[
          { days: 7 as const, href: "/admin/insights?range=7", label: "Last 7 days" },
          { days: 30 as const, href: "/admin/insights", label: "Last 30 days" },
        ].map((preset) => {
          const active = window.kind === "preset" && window.rangeDays === preset.days;
          return (
            <Link
              key={preset.days}
              href={preset.href}
              className={cn(
                "rounded-full px-3 py-1.5 text-xs font-medium transition",
                active
                  ? "bg-[color:var(--admin-primary)] text-[color:var(--admin-on-primary)] shadow-sm"
                  : "text-[color:var(--admin-ink-muted)] hover:bg-[color:var(--admin-surface-elevated)] hover:text-[color:var(--admin-ink)]",
              )}
              aria-current={active ? "true" : undefined}
            >
              {preset.label}
            </Link>
          );
        })}
      </div>

      <form method="get" action="/admin/insights" className="flex flex-wrap items-end gap-2">
        <div className="space-y-1">
          <label htmlFor="insights-from" className="text-[11px] text-muted-foreground">
            From
          </label>
          <Input
            id="insights-from"
            name="from"
            type="date"
            defaultValue={window.fromParam ?? ""}
            required
            className="h-9 w-[10.5rem]"
          />
        </div>
        <div className="space-y-1">
          <label htmlFor="insights-to" className="text-[11px] text-muted-foreground">
            To
          </label>
          <Input
            id="insights-to"
            name="to"
            type="date"
            defaultValue={window.toParam ?? ""}
            required
            className="h-9 w-[10.5rem]"
          />
        </div>
        <Button type="submit" variant="outline" size="sm" className="h-9">
          Apply
        </Button>
      </form>
    </div>
  );
}
