import type { ReactNode } from "react";

import { cn } from "@/ui/lib/utils";

type AdminPageHeaderProps = {
  title: string;
  description?: string;
  actions?: ReactNode;
  className?: string;
};

export function AdminPageHeader({
  title,
  description,
  actions,
  className,
}: AdminPageHeaderProps) {
  return (
    <div
      className={cn(
        "flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between",
        className,
      )}
    >
      <div className="min-w-0 space-y-1">
        <h1 className="font-[family-name:var(--font-admin-display)] text-2xl tracking-tight text-[color:var(--admin-ink)] sm:text-[1.75rem]">
          {title}
        </h1>
        {description ? (
          <p className="text-sm text-[color:var(--admin-ink-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex flex-wrap items-center gap-2">{actions}</div> : null}
    </div>
  );
}
