import type { AdminOrderDetail } from "@/modules/orders";
import { formatPackSizeLine, formatUnitPriceLabel } from "@/modules/catalog/selling-unit";
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
  const hasBogoLines = order.items.some(
    (item) => (item.freeQuantity ?? 0) > 0 || item.isBuyOneGetOne,
  );

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead className="text-right">
              {hasBogoLines ? "Paid Qty" : "Qty"}
            </TableHead>
            {hasBogoLines ? (
              <>
                <TableHead className="text-right">Free Qty</TableHead>
                <TableHead className="text-right">Fulfillment Qty</TableHead>
              </>
            ) : null}
            <TableHead className="text-right">Unit</TableHead>
            <TableHead className="text-right">Line</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {order.items.map((item) => {
            const freeQuantity = item.freeQuantity ?? 0;
            const fulfillmentQuantity =
              item.fulfillmentQuantity ?? item.quantity + freeQuantity;
            const showBogo = freeQuantity > 0 || item.isBuyOneGetOne;
            return (
              <TableRow key={item.id}>
                <TableCell>
                  <div className="font-medium">{item.name}</div>
                  {showBogo ? (
                    <div className="text-xs font-medium text-emerald-700">1+1</div>
                  ) : null}
                  {formatPackSizeLine(item.volume, item.sellingUnit) ? (
                    <div className="text-xs text-muted-foreground">
                      {formatPackSizeLine(item.volume, item.sellingUnit)}
                    </div>
                  ) : null}
                  {item.productId ? (
                    <div className="text-xs text-muted-foreground">
                      Snapshot · {item.productId}
                    </div>
                  ) : (
                    <div className="text-xs text-muted-foreground">Snapshot only</div>
                  )}
                </TableCell>
                <TableCell className="text-right">{item.quantity}</TableCell>
                {hasBogoLines ? (
                  <>
                    <TableCell className="text-right">{freeQuantity}</TableCell>
                    <TableCell className="text-right font-medium">
                      {fulfillmentQuantity}
                    </TableCell>
                  </>
                ) : null}
                <TableCell className="text-right">
                  {formatUnitPriceLabel(
                    formatMoney(item.unitPriceMinor, order.currency),
                    item.sellingUnit,
                  )}
                </TableCell>
                <TableCell className="text-right font-medium">
                  {formatMoney(item.lineTotalMinor, order.currency)}
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
