import Link from "next/link";

import { getAdminCategories } from "@/modules/catalog";
import { CategoryTable } from "@/modules/catalog/components/category-table";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { createTimer } from "@/shared/observability/timing";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";
import { TimingBadge } from "@/ui/admin/timing-badge";
import { buttonVariants } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

type AdminCategoriesPageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function AdminCategoriesPage({ searchParams }: AdminCategoriesPageProps) {
  const timer = createTimer("page.admin.categories");
  const session = await requireAdminSession();
  timer.mark("sessionMs");

  const categories = await getAdminCategories(session.tenantId);
  timer.mark("categoriesMs");
  const timings = timer.log({ categoryCount: categories.length });
  const params = await searchParams;

  return (
    <div className="space-y-6">
      <TimingBadge
        route="/admin/categories"
        timings={{
          session: Number(timings.sessionMs ?? 0),
          categories: Number(timings.categoriesMs ?? 0) - Number(timings.sessionMs ?? 0),
          total: Number(timings.totalMs ?? 0),
        }}
      />

      <AdminPageHeader
        title="Categories"
        description={`${categories.length} categor${categories.length === 1 ? "y" : "ies"} in ${session.tenantName}`}
        actions={
          <Link href="/admin/categories/new" className={cn(buttonVariants(), "rounded-full")}>
            New category
          </Link>
        }
      />

      {params.saved === "1" ? (
        <p className="rounded-xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] px-4 py-2.5 text-sm">
          Category saved.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
        <CategoryTable categories={categories} />
      </div>
    </div>
  );
}
