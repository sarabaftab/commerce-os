"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";

import {
  DASHBOARD_RANGES,
  dashboardRangeLabel,
  isValidDashboardDateParam,
  type DashboardWindow,
} from "@/modules/orders/dashboard-range";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { cn } from "@/ui/lib/utils";

type DashboardRangeSelectorProps = {
  window: DashboardWindow;
};

export function DashboardRangeSelector({ window }: DashboardRangeSelectorProps) {
  const router = useRouter();
  const isCustom = window.kind === "custom";
  const [showCustom, setShowCustom] = useState(isCustom);
  const [fromDate, setFromDate] = useState(window.fromParam ?? "");
  const [toDate, setToDate] = useState(window.toParam ?? "");
  const [error, setError] = useState<string | null>(null);

  const applyCustom = () => {
    if (!fromDate.trim() || !toDate.trim()) {
      setError("From and To dates are required.");
      return;
    }
    if (!isValidDashboardDateParam(fromDate) || !isValidDashboardDateParam(toDate)) {
      setError("Enter valid dates (YYYY-MM-DD).");
      return;
    }
    if (fromDate > toDate) {
      setError("From date cannot be after To date.");
      return;
    }
    setError(null);
    const params = new URLSearchParams({ from: fromDate, to: toDate });
    router.push(`/admin?${params.toString()}`);
  };

  return (
    <div className="flex flex-col items-stretch gap-3 sm:items-end">
      <div
        className="inline-flex flex-wrap gap-1 rounded-full border border-[color:var(--admin-line)] bg-[color:var(--admin-surface)] p-1"
        role="group"
        aria-label="Dashboard date range"
      >
        {DASHBOARD_RANGES.map((days) => {
          const active = !isCustom && window.rangeDays === days;
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
              onClick={() => {
                setShowCustom(false);
                setError(null);
              }}
            >
              {dashboardRangeLabel(days)}
            </Link>
          );
        })}
        <button
          type="button"
          className={cn(
            "rounded-full px-3 py-1.5 text-xs font-medium transition",
            isCustom || showCustom
              ? "bg-[color:var(--admin-primary)] text-[color:var(--admin-on-primary)] shadow-sm"
              : "text-[color:var(--admin-ink-muted)] hover:bg-[color:var(--admin-surface-elevated)] hover:text-[color:var(--admin-ink)]",
          )}
          aria-pressed={isCustom || showCustom}
          onClick={() => {
            setShowCustom(true);
            setError(null);
            if (isCustom) {
              setFromDate(window.fromParam ?? "");
              setToDate(window.toParam ?? "");
            }
          }}
        >
          Custom Range
        </button>
      </div>

      {showCustom || isCustom ? (
        <div className="w-full max-w-md space-y-3 rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] p-3 shadow-[var(--admin-shadow)] sm:w-auto">
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-1.5">
              <Label htmlFor="dashboard-from" className="text-xs">
                From
              </Label>
              <Input
                id="dashboard-from"
                type="date"
                value={fromDate}
                onChange={(event) => {
                  setFromDate(event.target.value);
                  setError(null);
                }}
                required
              />
            </div>
            <div className="grid gap-1.5">
              <Label htmlFor="dashboard-to" className="text-xs">
                To
              </Label>
              <Input
                id="dashboard-to"
                type="date"
                value={toDate}
                onChange={(event) => {
                  setToDate(event.target.value);
                  setError(null);
                }}
                required
              />
            </div>
          </div>
          {error ? (
            <p role="alert" className="text-xs text-destructive">
              {error}
            </p>
          ) : null}
          <div className="flex flex-wrap gap-2">
            <Button type="button" size="sm" className="rounded-full" onClick={applyCustom}>
              Apply
            </Button>
            <Link
              href="/admin"
              className={cn(
                "inline-flex h-8 items-center justify-center rounded-full px-3 text-xs font-medium text-[color:var(--admin-ink-muted)] underline-offset-4 hover:underline",
              )}
              onClick={() => {
                setShowCustom(false);
                setFromDate("");
                setToDate("");
                setError(null);
              }}
            >
              Reset
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}
