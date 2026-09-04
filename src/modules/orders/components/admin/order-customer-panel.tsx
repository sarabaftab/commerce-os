import type { AdminOrderDetail } from "@/modules/orders";
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
      <CardContent className="space-y-1 text-sm">
        <p className="font-medium">{order.customer.displayName ?? "—"}</p>
        <p className="text-muted-foreground">
          {order.customer.phone
            ? formatPhoneForDisplay(order.customer.phone)
            : "No phone"}
        </p>
        <p className="text-muted-foreground">{order.customer.email ?? "No email"}</p>
      </CardContent>
    </Card>
  );
}
