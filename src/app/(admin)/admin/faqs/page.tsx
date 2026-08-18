import Link from "next/link";

import { getAdminFaqs } from "@/modules/faq";
import { FaqTable } from "@/modules/faq/components/faq-table";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";
import { buttonVariants } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

type AdminFaqsPageProps = {
  searchParams: Promise<{ saved?: string }>;
};

export default async function AdminFaqsPage({ searchParams }: AdminFaqsPageProps) {
  const session = await requireAdminSession();
  const params = await searchParams;
  const faqs = await getAdminFaqs(session.tenantId);

  return (
    <div className="space-y-6">
      <AdminPageHeader
        title="FAQs"
        description={`${faqs.length} FAQ${faqs.length === 1 ? "" : "s"} in ${session.tenantName}`}
        actions={
          <Link href="/admin/faqs/new" className={cn(buttonVariants(), "rounded-full")}>
            New FAQ
          </Link>
        }
      />

      {params.saved === "1" ? (
        <p className="rounded-xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] px-4 py-2.5 text-sm">
          FAQ saved.
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
        <FaqTable faqs={faqs} />
      </div>
    </div>
  );
}
