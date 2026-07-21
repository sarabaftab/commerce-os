import type { AdminOrderDetail } from "@/modules/orders";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

type OrderFulfillmentPanelProps = {
  order: AdminOrderDetail;
};

export function OrderFulfillmentPanel({ order }: OrderFulfillmentPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Fulfillment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-1 text-sm">
        <p className="font-medium capitalize">{order.fulfillmentMethod}</p>
        {order.fulfillmentMethod === "delivery" ? (
          <>
            <p>{order.addressLine}</p>
            <p className="text-muted-foreground">{order.cityOrArea}</p>
            {order.deliveryInstructions ? (
              <p className="text-muted-foreground">{order.deliveryInstructions}</p>
            ) : null}
          </>
        ) : (
          <>
            <p>{order.pickupLocationName ?? order.pickupLocationKey}</p>
            {order.pickupLocationKey ? (
              <p className="text-muted-foreground">Key: {order.pickupLocationKey}</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
