import Link from "next/link";

import { CustomerListTable } from "@/modules/customers/components/admin/customer-list-table";
import { listCustomersForAdminTenant } from "@/modules/customers/services/customer-admin-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";

type AdminCustomersPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCustomersPage({ searchParams }: AdminCustomersPageProps) {
  const session = await requireAdminSession();
  const raw = await searchParams;
  const page = Math.max(1, Number.parseInt(String(raw.page ?? "1"), 10) || 1);
  const q = typeof raw.q === "string" ? raw.q : "";

  const result = await listCustomersForAdminTenant(session.tenantId, {
    page,
    pageSize: 20,
    q,
  });

  const paginationParams = new URLSearchParams();
  if (q) {
    paginationParams.set("q", q);
  }

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Customers"
        description={`Customer profiles and order history for ${session.tenantName}`}
      />

      <form className="flex flex-wrap gap-2" method="get">
        <Input
          name="q"
          defaultValue={q}
          placeholder="Search name, phone, or email"
          className="max-w-sm"
        />
        <Button type="submit" variant="outline">
          Search
        </Button>
      </form>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
        <CustomerListTable customers={result.items} />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          {result.total} {result.total === 1 ? "customer" : "customers"} · page {result.page}{" "}
          of {result.totalPages}
        </p>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link
              href={`/admin/customers?${new URLSearchParams({
                ...Object.fromEntries(paginationParams),
                page: String(result.page - 1),
              }).toString()}`}
            >
              <Button variant="outline" size="sm">
                Previous
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Previous
            </Button>
          )}
          {result.page < result.totalPages ? (
            <Link
              href={`/admin/customers?${new URLSearchParams({
                ...Object.fromEntries(paginationParams),
                page: String(result.page + 1),
              }).toString()}`}
            >
              <Button variant="outline" size="sm">
                Next
              </Button>
            </Link>
          ) : (
            <Button variant="outline" size="sm" disabled>
              Next
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
