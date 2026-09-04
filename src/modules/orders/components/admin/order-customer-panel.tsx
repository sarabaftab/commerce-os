import Link from "next/link";

import type { AdminOrderDetail } from "@/modules/orders";
import { CustomerTypeBadge } from "@/modules/customers/components/admin/customer-type-badge";
import { formatPhoneForDisplay } from "@/shared/phone/normalize-phone";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

type OrderCustomerPanelProps = {
  order: AdminOrderDetail;
};

export function OrderCustomerPanel({ order }: OrderCustomerPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <CustomerTypeBadge type={order.customerType} />
        <div>
          <Link
            href={`/admin/customers/${order.customer.id}`}
            className="font-medium underline-offset-4 hover:underline"
          >
            {order.customer.displayName ?? "—"}
          </Link>
          <p className="text-muted-foreground">
            {order.customer.phone
              ? formatPhoneForDisplay(order.customer.phone)
              : "No phone"}
          </p>
          <p className="text-muted-foreground">{order.customer.email ?? "No email"}</p>
          {order.telegramLinked ? (
            <p className="text-xs text-muted-foreground">Telegram connected</p>
          ) : null}
        </div>
      </CardContent>
    </Card>
  );
}
