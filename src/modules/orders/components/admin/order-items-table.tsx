import type { AdminOrderDetail } from "@/modules/orders";
import { formatMoney } from "@/shared/money/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";

type OrderItemsTableProps = {
  order: AdminOrderDetail;
};

export function OrderItemsTable({ order }: OrderItemsTableProps) {
  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">Qty</TableHead>
            <TableHead className="text-right">Unit</TableHead>
            <TableHead className="text-right">Line</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <div className="font-medium">{item.name}</div>
                {item.productId ? (
                  <div className="text-xs text-muted-foreground">Snapshot · {item.productId}</div>
                ) : (
                  <div className="text-xs text-muted-foreground">Snapshot only</div>
                )}
              </TableCell>
              <TableCell className="text-right">{item.quantity}</TableCell>
              <TableCell className="text-right">
                {formatMoney(item.unitPriceMinor, order.currency)}
              </TableCell>
              <TableCell className="text-right font-medium">
                {formatMoney(item.lineTotalMinor, order.currency)}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
