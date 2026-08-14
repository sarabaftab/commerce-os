import { getCategoriesForTenant } from "@/modules/catalog";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { createTimer } from "@/shared/observability/timing";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";
import { TimingBadge } from "@/ui/admin/timing-badge";
import { Badge } from "@/ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";

export default async function AdminCategoriesPage() {
  const timer = createTimer("page.admin.categories");

  const session = await requireAdminSession();
  timer.mark("sessionMs");

  const categories = await getCategoriesForTenant(session.tenantId);
  timer.mark("categoriesMs");

  const timings = timer.log({ categoryCount: categories.length });

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
        description="Read-only list for Phase 1. Manage via seed or SQL for now."
      />

      <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Name</TableHead>
              <TableHead>Slug</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Sort</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {categories.map((category) => (
              <TableRow key={category.id}>
                <TableCell className="font-medium">{category.name}</TableCell>
                <TableCell>{category.slug}</TableCell>
                <TableCell>
                  <Badge variant={category.isActive ? "default" : "secondary"}>
                    {category.isActive ? "Active" : "Inactive"}
                  </Badge>
                </TableCell>
                <TableCell>{category.sortOrder}</TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
