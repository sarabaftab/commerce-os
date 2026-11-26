import Link from "next/link";
import { Star } from "lucide-react";

import type { AdminOrderFeedbackListItem } from "@/modules/orders/services/order-feedback-service";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";

type FeedbackListTableProps = {
  items: AdminOrderFeedbackListItem[];
};

function RatingStars({ rating }: { rating: number }) {
  return (
    <div className="flex items-center gap-0.5" aria-label={`${rating} out of 5`}>
      {[1, 2, 3, 4, 5].map((value) => (
        <Star
          key={value}
          className={
            value <= rating
              ? "size-3.5 fill-amber-400 text-amber-400"
              : "size-3.5 text-muted-foreground/40"
          }
        />
      ))}
    </div>
  );
}

export function FeedbackListTable({ items }: FeedbackListTableProps) {
  if (items.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-[color:var(--admin-ink-muted)]">
        No customer feedback yet.
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Order</TableHead>
            <TableHead>Rating</TableHead>
            <TableHead>Comment</TableHead>
            <TableHead>Submitted</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {items.map((item) => (
            <TableRow key={item.id}>
              <TableCell>
                <Link
                  href={`/admin/customers/${item.customerId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {item.customerDisplayName ?? "—"}
                </Link>
              </TableCell>
              <TableCell>
                <Link
                  href={`/admin/orders/${item.orderId}`}
                  className="font-medium underline-offset-4 hover:underline"
                >
                  {item.orderNumber}
                </Link>
              </TableCell>
              <TableCell>
                <RatingStars rating={item.rating} />
              </TableCell>
              <TableCell className="max-w-xs truncate text-sm text-muted-foreground">
                {item.comment?.trim() || "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {item.createdAt.toLocaleString()}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
