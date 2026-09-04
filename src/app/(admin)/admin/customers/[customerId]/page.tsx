import Link from "next/link";
import { notFound } from "next/navigation";

import { CustomerProfileView } from "@/modules/customers/components/admin/customer-profile-view";
import { getCustomerProfileForAdmin } from "@/modules/customers/services/customer-admin-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";
import { AdminPageHeader } from "@/ui/admin/admin-page-header";

type AdminCustomerDetailPageProps = {
  params: Promise<{ customerId: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

export default async function AdminCustomerDetailPage({
  params,
  searchParams,
}: AdminCustomerDetailPageProps) {
  const session = await requireAdminSession();
  const { customerId } = await params;
  const raw = await searchParams;
  const orderPage = Math.max(1, Number.parseInt(String(raw.page ?? "1"), 10) || 1);

  let profile;
  try {
    profile = await getCustomerProfileForAdmin(session.tenantId, customerId, {
      orderPage,
      orderPageSize: 20,
    });
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/customers"
        className="inline-flex text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to customers
      </Link>

      <AdminPageHeader
        title={profile.displayName ?? "Customer"}
        description={profile.phoneDisplay || "Customer profile"}
      />

      <CustomerProfileView profile={profile} />
    </div>
  );
}
