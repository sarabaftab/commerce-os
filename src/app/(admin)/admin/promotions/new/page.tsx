import { createPromotionAction } from "@/modules/promotions/actions/promotion-actions";
import { PromotionForm } from "@/modules/promotions/components/promotion-form";
import { requireAdminSession } from "@/shared/auth/admin-session";

export default async function NewPromotionPage() {
  const session = await requireAdminSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New promotion</h1>
        <p className="text-sm text-muted-foreground">
          Create a campaign discount for {session.tenantName}
        </p>
      </div>
      <PromotionForm
        currency={session.tenantCurrency}
        action={createPromotionAction}
        submitLabel="Create promotion"
      />
    </div>
  );
}
