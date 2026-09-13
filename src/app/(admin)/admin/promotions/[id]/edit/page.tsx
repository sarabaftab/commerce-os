import { notFound } from "next/navigation";

import { getPromotionForTenant } from "@/modules/promotions";
import { updatePromotionAction } from "@/modules/promotions/actions/promotion-actions";
import { PromotionForm } from "@/modules/promotions/components/promotion-form";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function EditPromotionPage({ params }: Props) {
  const session = await requireAdminSession();
  const { id } = await params;

  let promotion;
  try {
    promotion = await getPromotionForTenant(session.tenantId, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit promotion</h1>
        <p className="text-sm text-muted-foreground">{promotion.name}</p>
      </div>
      <PromotionForm
        currency={session.tenantCurrency}
        promotion={promotion}
        action={updatePromotionAction.bind(null, promotion.id)}
        submitLabel="Save promotion"
      />
    </div>
  );
}
