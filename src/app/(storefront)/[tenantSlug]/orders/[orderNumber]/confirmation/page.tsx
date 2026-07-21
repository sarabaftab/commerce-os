import Link from "next/link";
import { notFound } from "next/navigation";

import { getOrderConfirmation } from "@/modules/orders";
import { OrderConfirmationView } from "@/modules/orders/components/order-confirmation";
import { resolveStorefrontTenant } from "@/modules/storefront";

export const dynamic = "force-dynamic";

type OrderConfirmationPageProps = {
  params: Promise<{ tenantSlug: string; orderNumber: string }>;
};

export default async function OrderConfirmationPage({ params }: OrderConfirmationPageProps) {
  const { tenantSlug, orderNumber } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);

  const order = await getOrderConfirmation(tenant.id, orderNumber);
  if (!order) {
    notFound();
  }

  return (
    <div className="space-y-6 pt-4">
      <div>
        <Link
          href={`${basePath}/products`}
          className="inline-flex text-sm font-medium text-[color:var(--shop-accent)]"
        >
          Continue shopping
        </Link>
      </div>

      <OrderConfirmationView order={order} />
    </div>
  );
}
