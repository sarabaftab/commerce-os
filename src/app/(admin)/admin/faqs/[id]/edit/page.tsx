import { notFound } from "next/navigation";

import { getFaqForTenant } from "@/modules/faq";
import { updateFaqAction } from "@/modules/faq/actions/faq-actions";
import { FaqForm } from "@/modules/faq/components/faq-form";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

export default async function EditFaqPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const { id } = await params;

  let faq;
  try {
    faq = await getFaqForTenant(session.tenantId, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const boundUpdate = updateFaqAction.bind(null, faq.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit FAQ</h1>
        <p className="text-sm text-muted-foreground">{faq.question}</p>
      </div>
      <FaqForm faq={faq} action={boundUpdate} submitLabel="Save changes" />
    </div>
  );
}
