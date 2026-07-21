import type { AdminOrderDetail } from "@/modules/orders";
import { formatMoney } from "@/shared/money/money";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

type OrderPricingSummaryProps = {
  order: AdminOrderDetail;
};

export function OrderPricingSummary({ order }: OrderPricingSummaryProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Pricing</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        <div className="flex justify-between">
          <span className="text-muted-foreground">Subtotal</span>
          <span>{formatMoney(order.subtotalMinor, order.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Discount</span>
          <span>{formatMoney(order.discountMinor, order.currency)}</span>
        </div>
        <div className="flex justify-between">
          <span className="text-muted-foreground">Delivery fee</span>
          <span>{formatMoney(order.deliveryFeeMinor, order.currency)}</span>
        </div>
        <div className="flex justify-between border-t pt-2 font-semibold">
          <span>Total</span>
          <span>{formatMoney(order.totalMinor, order.currency)}</span>
        </div>
      </CardContent>
    </Card>
  );
}
