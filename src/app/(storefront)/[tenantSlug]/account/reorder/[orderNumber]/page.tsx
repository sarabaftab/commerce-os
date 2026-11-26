import { redirect } from "next/navigation";

import { loadAccountPageSession } from "@/modules/customers";
import { rebuildCartFromCustomerOrder } from "@/modules/orders/services/reorder-cart-service";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { isAppError } from "@/shared/errors/app-error";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tenantSlug: string; orderNumber: string }>;
};

/**
 * One-tap reorder: rebuild cart from a prior order owned by the session customer,
 * then send them to the cart to review current availability/pricing before checkout.
 */
export default async function AccountReorderPage({ params }: PageProps) {
  const { tenantSlug, orderNumber } = await params;
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const session = await loadAccountPageSession(tenant.id);
  if (!session) {
    return null;
  }

  try {
    const result = await rebuildCartFromCustomerOrder({
      identity: {
        tenantId: session.tenantId,
        customerId: session.customerId,
      },
      tenantCurrency: tenant.currency,
      orderNumber: decodeURIComponent(orderNumber),
    });

    const qs = new URLSearchParams({
      reorder: "1",
      added: String(result.addedCount),
      skipped: String(result.skipped.length),
    });
    redirect(`/${tenantSlug}/cart?${qs.toString()}`);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      redirect(`/${tenantSlug}/account/orders?reorder=missing`);
    }
    throw error;
  }
}
