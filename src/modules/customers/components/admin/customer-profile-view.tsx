import Link from "next/link";

import type { AdminCustomerProfile } from "@/modules/customers/services/customer-admin-service";
import { formatMoney } from "@/shared/money/money";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";

import { CustomerLifecycleBadge, CustomerTypeBadge } from "./customer-type-badge";

type CustomerProfileViewProps = {
  profile: AdminCustomerProfile;
};

function formatPayment(method: string) {
  return method === "cod" ? "COD" : "ABA";
}

export function CustomerProfileView({ profile }: CustomerProfileViewProps) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Overview
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1 text-sm">
            <p className="text-base font-semibold">{profile.displayName ?? "—"}</p>
            <p className="text-muted-foreground">{profile.phoneDisplay || "No phone"}</p>
            <p className="text-muted-foreground">{profile.email ?? "No email"}</p>
            {profile.telegramLinked ? (
              <Badge variant="secondary" className="mt-2 rounded-full">
                Telegram connected
              </Badge>
            ) : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Customer since
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            <p className="text-base font-semibold">
              {profile.customerSince.toLocaleDateString()}
            </p>
            <CustomerLifecycleBadge lifecycle={profile.lifecycle} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-semibold tabular-nums">{profile.totalOrders}</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lifetime value
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-1">
            <p className="text-2xl font-semibold tabular-nums">
              {formatMoney(profile.lifetimeValueMinor, profile.currency)}
            </p>
            <p className="text-xs text-muted-foreground">Excludes cancelled orders</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Last order</CardTitle>
        </CardHeader>
        <CardContent className="text-sm">
          {profile.lastOrderAt && profile.lastOrderNumber && profile.lastOrderId ? (
            <div className="flex flex-wrap items-center gap-2">
              <Link
                href={`/admin/orders/${profile.lastOrderId}`}
                className="font-medium underline-offset-4 hover:underline"
              >
                {profile.lastOrderNumber}
              </Link>
              {profile.lastOrderStatus ? (
                <Badge variant="secondary" className="capitalize">
                  {profile.lastOrderStatus.replaceAll("_", " ")}
                </Badge>
              ) : null}
              <span className="text-muted-foreground">
                {profile.lastOrderAt.toLocaleString()}
              </span>
            </div>
          ) : (
            <p className="text-muted-foreground">No orders yet.</p>
          )}
        </CardContent>
      </Card>

      <div className="space-y-3">
        <h2 className="text-sm font-semibold">Order history</h2>
        <div className="overflow-hidden rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] shadow-[var(--admin-shadow)]">
          {profile.orders.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-muted-foreground">
              No orders found for this customer.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order</TableHead>
                  <TableHead>Date</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Payment</TableHead>
                  <TableHead>Fulfillment</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead className="text-right">Total</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {profile.orders.map((order) => (
                  <TableRow key={order.id}>
                    <TableCell>
                      <Link
                        href={`/admin/orders/${order.id}`}
                        className="font-medium underline-offset-4 hover:underline"
                      >
                        {order.orderNumber}
                      </Link>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {order.placedAt.toLocaleString()}
                    </TableCell>
                    <TableCell>
                      <Badge variant="secondary" className="capitalize">
                        {order.status.replaceAll("_", " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>{formatPayment(order.paymentMethod)}</TableCell>
                    <TableCell className="capitalize">{order.fulfillmentMethod}</TableCell>
                    <TableCell>
                      <CustomerTypeBadge type={order.customerType} />
                    </TableCell>
                    <TableCell className="text-right font-medium">
                      {formatMoney(order.totalMinor, order.currency)}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </div>

        {profile.orderTotalPages > 1 ? (
          <div className="flex items-center justify-between gap-3 text-sm">
            <p className="text-muted-foreground">
              {profile.totalOrders}{" "}
              {profile.totalOrders === 1 ? "order" : "orders"} · page {profile.orderPage} of{" "}
              {profile.orderTotalPages}
            </p>
            <div className="flex gap-2">
              {profile.orderPage > 1 ? (
                <Link href={`/admin/customers/${profile.id}?page=${profile.orderPage - 1}`}>
                  <Button variant="outline" size="sm">
                    Previous
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Previous
                </Button>
              )}
              {profile.orderPage < profile.orderTotalPages ? (
                <Link href={`/admin/customers/${profile.id}?page=${profile.orderPage + 1}`}>
                  <Button variant="outline" size="sm">
                    Next
                  </Button>
                </Link>
              ) : (
                <Button variant="outline" size="sm" disabled>
                  Next
                </Button>
              )}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
