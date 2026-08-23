import Link from "next/link";
import { notFound } from "next/navigation";

import { OrderCustomerPanel } from "@/modules/orders/components/admin/order-customer-panel";
import { OrderDetailHeader } from "@/modules/orders/components/admin/order-detail-header";
import { OrderFulfillmentPanel } from "@/modules/orders/components/admin/order-fulfillment-panel";
import { OrderItemsTable } from "@/modules/orders/components/admin/order-items-table";
import { OrderNotificationPanel } from "@/modules/orders/components/admin/order-notification-panel";
import { OrderPaymentPanel } from "@/modules/orders/components/admin/order-payment-panel";
import { OrderPricingSummary } from "@/modules/orders/components/admin/order-pricing-summary";
import { OrderStatusForm } from "@/modules/orders/components/admin/order-status-form";
import { OrderStatusTimeline } from "@/modules/orders/components/admin/order-status-timeline";
import { getOrderDetailForAdmin } from "@/modules/orders/services/order-admin-service";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

type AdminOrderDetailPageProps = {
  params: Promise<{ orderId: string }>;
};

export default async function AdminOrderDetailPage({ params }: AdminOrderDetailPageProps) {
  const session = await requireAdminSession();
  const { orderId } = await params;

  let order;
  try {
    order = await getOrderDetailForAdmin(session.tenantId, orderId);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <Link
        href="/admin/orders"
        className="inline-flex text-sm font-medium text-muted-foreground underline-offset-4 hover:underline"
      >
        ← Back to orders
      </Link>

      <OrderDetailHeader order={order} />

      <div className="grid gap-4 lg:grid-cols-3">
        <div className="space-y-4 lg:col-span-2">
          <div className="grid gap-4 md:grid-cols-3">
            <OrderCustomerPanel order={order} />
            <OrderFulfillmentPanel order={order} />
            <OrderPaymentPanel order={order} />
          </div>

          <div className="space-y-2">
            <h2 className="text-sm font-semibold">Items</h2>
            <OrderItemsTable order={order} />
          </div>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Order notes</CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                {order.notes?.trim() ? order.notes : "No internal notes."}
              </p>
            </CardContent>
          </Card>

          <OrderStatusTimeline history={order.statusHistory} />
        </div>

        <div className="space-y-4">
          <OrderPricingSummary order={order} />
          <OrderNotificationPanel
            orderId={order.id}
            telegramLinked={order.telegramLinked}
            notifications={order.notifications}
          />
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Update status</CardTitle>
            </CardHeader>
            <CardContent>
              <OrderStatusForm
                orderId={order.id}
                allowedNextStatuses={order.allowedNextStatuses}
              />
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
