import Link from "next/link";

import { getAdminProductList } from "@/modules/catalog";
import { ProductTable } from "@/modules/catalog/components/product-table";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { createTimer } from "@/shared/observability/timing";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";
import { TimingBadge } from "@/ui/admin/timing-badge";
import { buttonVariants } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

type AdminProductsPageProps = {
  searchParams: Promise<{ page?: string }>;
};

export default async function AdminProductsPage({ searchParams }: AdminProductsPageProps) {
  const timer = createTimer("page.admin.products");
  const params = await searchParams;
  const page = Math.max(1, Number.parseInt(params.page ?? "1", 10) || 1);

  const session = await requireAdminSession();
  timer.mark("sessionMs");

  const list = await getAdminProductList(session.tenantId, { page, pageSize: 50 });
  timer.mark("productsMs");

  const timings = timer.log({ productCount: list.items.length, total: list.total, page: list.page });

  return (
    <div className="space-y-6">
      <TimingBadge
        route="/admin/products"
        timings={{
          session: Number(timings.sessionMs ?? 0),
          products: Number(timings.productsMs ?? 0) - Number(timings.sessionMs ?? 0),
          total: Number(timings.totalMs ?? 0),
        }}
      />

      <AdminPageHeader
        title="Products"
        description={`${list.total} products in ${session.tenantName}`}
        actions={
          <div className="flex flex-wrap gap-2">
            <Link
              href="/admin/products/import"
              className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
            >
              Import products
            </Link>
            <Link
              href="/admin/products/new"
              className={cn(
                buttonVariants(),
                "rounded-full bg-[color:var(--admin-primary)] text-[color:var(--admin-on-primary)] hover:bg-[color:var(--admin-accent)]",
              )}
            >
              New product
            </Link>
          </div>
        }
      />

      <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
        <ProductTable products={list.items} />
      </div>

      {list.totalPages > 1 ? (
        <div className="flex items-center justify-between gap-3 text-sm">
          <p className="text-[color:var(--admin-ink-muted)]">
            Page {list.page} of {list.totalPages}
          </p>
          <div className="flex gap-2">
            {list.page > 1 ? (
              <Link
                href={`/admin/products?page=${list.page - 1}`}
                className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
              >
                Previous
              </Link>
            ) : null}
            {list.page < list.totalPages ? (
              <Link
                href={`/admin/products?page=${list.page + 1}`}
                className={cn(buttonVariants({ variant: "outline" }), "rounded-full")}
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
