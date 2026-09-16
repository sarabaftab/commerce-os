import type { AdminOrderDetail } from "@/modules/orders";
import { openStreetMapPinUrl, parseOptionalLatLng } from "@/modules/locations/coordinates";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

type OrderFulfillmentPanelProps = {
  order: AdminOrderDetail;
};

export function OrderFulfillmentPanel({ order }: OrderFulfillmentPanelProps) {
  const pin = parseOptionalLatLng(order.deliveryLatitude, order.deliveryLongitude);

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
            {pin ? (
              <p className="pt-2">
                <a
                  href={openStreetMapPinUrl(pin)}
                  target="_blank"
                  rel="noreferrer"
                  className="font-medium text-[color:var(--admin-ink)] underline decoration-[color:var(--admin-primary)] underline-offset-4"
                >
                  View Delivery Location
                </a>
              </p>
            ) : null}
          </>
        ) : (
          <>
            <p>{order.pickupLocationName ?? order.pickupLocationKey}</p>
            {order.pickupLocationAddress ? (
              <p className="text-muted-foreground">{order.pickupLocationAddress}</p>
            ) : null}
            {order.pickupLocationKey ? (
              <p className="text-muted-foreground">Key: {order.pickupLocationKey}</p>
            ) : null}
          </>
        )}
      </CardContent>
    </Card>
  );
}
