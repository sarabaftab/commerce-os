import Link from "next/link";

import { getAdminPromotions } from "@/modules/promotions";
import { PromotionTable } from "@/modules/promotions/components/promotion-table";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";
import { buttonVariants } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

type Props = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function AdminPromotionsPage({ searchParams }: Props) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const promotions = await getAdminPromotions(session.tenantId);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="Promotions"
        description={`Manual campaign discounts for ${session.tenantName}`}
        actions={
          <Link href="/admin/promotions/new" className={cn(buttonVariants(), "rounded-full")}>
            New promotion
          </Link>
        }
      />

      {params.saved === "1" ? (
        <p className="rounded-xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] px-4 py-2.5 text-sm">
          Promotion saved.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
        <PromotionTable promotions={promotions} currency={session.tenantCurrency} />
      </div>
    </div>
  );
}
