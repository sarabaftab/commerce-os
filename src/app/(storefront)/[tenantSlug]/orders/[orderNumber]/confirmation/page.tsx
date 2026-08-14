import Link from "next/link";
import { notFound } from "next/navigation";

import { getOptionalCustomerSession } from "@/modules/customers";
import { getAuthorizedOrderConfirmation } from "@/modules/orders";
import { OrderConfirmationView } from "@/modules/orders/components/order-confirmation";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { readOrderConfirmationCookie } from "@/shared/orders/confirmation-cookie";

export const dynamic = "force-dynamic";

type OrderConfirmationPageProps = {
  params: Promise<{ tenantSlug: string; orderNumber: string }>;
};

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { tenantSlug, orderNumber } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);

  const [session, confirmCookie] = await Promise.all([
    getOptionalCustomerSession(tenant.id),
    readOrderConfirmationCookie(),
  ]);

  const token =
    confirmCookie?.orderNumber === orderNumber ? confirmCookie.token : null;

  const order = await getAuthorizedOrderConfirmation({
    tenantId: tenant.id,
    orderNumber,
    confirmationToken: token,
    customerId: session?.customerId ?? null,
  });

  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6 pt-4">
      <div>
        <Link
          href={`${basePath}/products`}
          className="inline-flex text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
        >
          Continue shopping
        </Link>
      </div>

      <OrderConfirmationView order={order} />
    </div>
  );
}
