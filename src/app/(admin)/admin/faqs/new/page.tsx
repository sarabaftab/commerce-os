import { createFaqAction } from "@/modules/faq/actions/faq-actions";
import { FaqForm } from "@/modules/faq/components/faq-form";
import { requireAdminSession } from "@/shared/auth/admin-session";

export default async function NewFaqPage() {
  const session = await requireAdminSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New FAQ</h1>
        <p className="text-sm text-muted-foreground">
          Add a customer-facing question for {session.tenantName}
        </p>
      </div>
      <FaqForm action={createFaqAction} submitLabel="Create FAQ" />
    </div>
  );
}
