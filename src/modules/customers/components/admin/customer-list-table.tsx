import Link from "next/link";

import type { AdminCustomerListItem } from "@/modules/customers/services/customer-admin-service";
import { formatMoney } from "@/shared/money/money";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";

import { CustomerLifecycleBadge } from "./customer-type-badge";

type CustomerListTableProps = {
  customers: AdminCustomerListItem[];
};

export function CustomerListTable({ customers }: CustomerListTableProps) {
  if (customers.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-[color:var(--admin-ink-muted)]">
        No customers found.
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Customer</TableHead>
            <TableHead>Phone</TableHead>
            <TableHead>Status</TableHead>
            <TableHead className="text-right">Orders</TableHead>
            <TableHead className="text-right">Lifetime spend</TableHead>
            <TableHead>Last order</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {customers.map((customer) => (
            <TableRow key={customer.id}>
              <TableCell>
                <Link
                  href={`/admin/customers/${customer.id}`}
                  className="font-medium text-foreground underline-offset-4 hover:underline"
                >
                  {customer.displayName ?? "—"}
                </Link>
                {customer.telegramLinked ? (
                  <div className="text-xs text-muted-foreground">Telegram connected</div>
                ) : null}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {customer.phoneDisplay || "—"}
              </TableCell>
              <TableCell>
                <CustomerLifecycleBadge lifecycle={customer.lifecycle} />
              </TableCell>
              <TableCell className="text-right tabular-nums">{customer.totalOrders}</TableCell>
              <TableCell className="text-right tabular-nums">
                {formatMoney(customer.lifetimeValueMinor, customer.currency)}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {customer.lastOrderAt ? (
                  <div>
                    <div>{customer.lastOrderAt.toLocaleString()}</div>
                    {customer.lastOrderNumber ? (
                      <div className="text-xs">{customer.lastOrderNumber}</div>
                    ) : null}
                  </div>
                ) : (
                  "—"
                )}
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
