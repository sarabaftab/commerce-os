import Link from "next/link";

import type { OrderAdminListQueryInput } from "@/modules/orders/schemas/order-admin";
import { ORDER_STATUSES } from "@/modules/orders";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";

type OrderListFiltersProps = {
  query: OrderAdminListQueryInput;
};

export function OrderListFilters({ query }: OrderListFiltersProps) {
  return (
    <form method="get" className="grid gap-3 rounded-lg border p-4 md:grid-cols-6">
      <div className="md:col-span-2 space-y-1.5">
        <Label htmlFor="q">Search</Label>
        <Input
          id="q"
          name="q"
          defaultValue={query.q ?? ""}
          placeholder="Order #, name, or phone"
        />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="status">Status</Label>
        <select
          id="status"
          name="status"
          defaultValue={query.status ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All</option>
          {ORDER_STATUSES.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="paymentMethod">Payment</Label>
        <select
          id="paymentMethod"
          name="paymentMethod"
          defaultValue={query.paymentMethod ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All</option>
          <option value="cod">Cash on Delivery</option>
          <option value="aba_transfer">ABA Transfer</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="fulfillmentMethod">Fulfillment</Label>
        <select
          id="fulfillmentMethod"
          name="fulfillmentMethod"
          defaultValue={query.fulfillmentMethod ?? ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
        >
          <option value="">All</option>
          <option value="delivery">Delivery</option>
          <option value="pickup">Pickup</option>
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="from">From</Label>
        <Input id="from" name="from" type="date" defaultValue={query.from ?? ""} />
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="to">To</Label>
        <Input id="to" name="to" type="date" defaultValue={query.to ?? ""} />
      </div>

      <div className="flex items-end gap-2 md:col-span-6">
        <Button type="submit">Apply filters</Button>
        <Link href="/admin/orders">
          <Button type="button" variant="outline">
            Reset
          </Button>
        </Link>
      </div>
    </form>
  );
}
