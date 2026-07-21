import Link from "next/link";

import type { AdminOrderListItem } from "@/modules/orders";
import { formatMoney } from "@/shared/money/money";
import { Badge } from "@/ui/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";

type OrderListTableProps = {
  orders: AdminOrderListItem[];
};

function formatPayment(method: AdminOrderListItem["paymentMethod"]) {
  return method === "cod" ? "COD" : "ABA";
}

export function OrderListTable({ orders }: OrderListTableProps) {
  if (orders.length === 0) {
    return (
      <div className="rounded-lg border border-dashed px-4 py-12 text-center text-sm text-muted-foreground">
        No orders match these filters.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Order</TableHead>
            <TableHead>Customer</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Payment</TableHead>
            <TableHead>Fulfillment</TableHead>
            <TableHead className="text-right">Total</TableHead>
            <TableHead>Placed</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {orders.map((order) => (
            <TableRow key={order.id}>
              <TableCell>
                <Link
                  href={`/admin/orders/${order.id}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {order.orderNumber}
                </Link>
              </TableCell>
              <TableCell>
                <div className="text-sm">{order.customer.displayName ?? "—"}</div>
                <div className="text-xs text-muted-foreground">
                  {order.customer.phone ?? ""}
                </div>
              </TableCell>
              <TableCell>
                <Badge variant="secondary" className="capitalize">
                  {order.status.replaceAll("_", " ")}
                </Badge>
              </TableCell>
              <TableCell>{formatPayment(order.paymentMethod)}</TableCell>
              <TableCell className="capitalize">{order.fulfillmentMethod}</TableCell>
              <TableCell className="text-right font-medium">
                {formatMoney(order.totalMinor, order.currency)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {order.placedAt.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
