import type { AdminOrderDetail } from "@/modules/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

type OrderPaymentPanelProps = {
  order: AdminOrderDetail;
};

function formatPayment(method: AdminOrderDetail["paymentMethod"]) {
  return method === "cod" ? "Cash on Delivery" : "ABA Transfer";
}

export function OrderPaymentPanel({ order }: OrderPaymentPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="font-medium">{formatPayment(order.paymentMethod)}</p>
        {order.paymentReference ? (
          <p className="text-muted-foreground">Reference: {order.paymentReference}</p>
        ) : (
          <p className="text-muted-foreground">No payment reference</p>
        )}
      </CardContent>
    </Card>
  );
}
