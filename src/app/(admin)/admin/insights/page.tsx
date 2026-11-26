import { InsightsRangeSelector } from "@/modules/orders/components/admin/insights-range-selector";
import { InsightsSections } from "@/modules/orders/components/admin/insights-sections";
import { resolveInsightsWindow } from "@/modules/orders/insights-range";
import { getAdminInsightsSnapshot } from "@/modules/orders/services/insights-stats-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";

type AdminInsightsPageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminInsightsPage({ searchParams }: AdminInsightsPageProps) {
  const session = await requireAdminSession();
  const raw = await searchParams;
  const window = resolveInsightsWindow({
    range: raw.range,
    from: raw.from,
    to: raw.to,
  });
  const snapshot = await getAdminInsightsSnapshot(session.tenantId, window);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Insights"
        description={`Business and customer metrics for ${session.tenantName}`}
      />
      <InsightsRangeSelector window={window} />
      <InsightsSections data={snapshot} />
    </div>
  );
}
