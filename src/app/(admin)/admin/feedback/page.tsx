import Link from "next/link";

import { FeedbackListTable } from "@/modules/orders/components/admin/feedback-list-table";
import { listOrderFeedbackForAdminTenant } from "@/modules/orders/services/order-feedback-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";
import { Button } from "@/ui/components/ui/button";

type AdminFeedbackPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminFeedbackPage({ searchParams }: AdminFeedbackPageProps) {
  const session = await requireAdminSession();
  const raw = await searchParams;
  const page = Math.max(1, Number.parseInt(String(raw.page ?? "1"), 10) || 1);

  const result = await listOrderFeedbackForAdminTenant(session.tenantId, {
    page,
    pageSize: 20,
  });

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Feedback"
        description={`Customer ratings for completed orders · ${session.tenantName}`}
      />

      <div className="flex flex-wrap gap-4 text-sm text-muted-foreground">
        <p>
          <span className="font-medium text-foreground">{result.feedbackCount}</span>{" "}
          {result.feedbackCount === 1 ? "rating" : "ratings"}
        </p>
        <p>
          Average{" "}
          <span className="font-medium text-foreground">
            {result.averageRating != null ? `${result.averageRating} / 5` : "—"}
          </span>
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
        <FeedbackListTable items={result.items} />
      </div>

      <div className="flex items-center justify-between gap-3 text-sm">
        <p className="text-muted-foreground">
          Page {result.page} of {result.totalPages}
        </p>
        <div className="flex gap-2">
          {result.page > 1 ? (
            <Link href={`/admin/feedback?page=${result.page - 1}`}>
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
            <Link href={`/admin/feedback?page=${result.page + 1}`}>
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
