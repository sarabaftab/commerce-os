import type { AdminOrderDetail } from "@/modules/orders";
import { Badge } from "@/ui/components/ui/badge";

type OrderDetailHeaderProps = {
  order: AdminOrderDetail;
};

export function OrderDetailHeader({ order }: OrderDetailHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{order.orderNumber}</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Placed {order.placedAt.toLocaleString()} · Channel {order.channel}
        </p>
      </div>
      <Badge variant="secondary" className="capitalize">
        {order.status.replaceAll("_", " ")}
      </Badge>
    </div>
  );
}
