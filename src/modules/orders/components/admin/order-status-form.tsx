"use client";

import { useActionState } from "react";

import type { OrderStatus } from "@/modules/orders";
import {
  updateOrderStatusAction,
  type OrderStatusActionState,
} from "@/modules/orders/actions/order-admin-actions";
import { Button } from "@/ui/components/ui/button";
import { Label } from "@/ui/components/ui/label";
import { Textarea } from "@/ui/components/ui/textarea";

type OrderStatusFormProps = {
  orderId: string;
  allowedNextStatuses: OrderStatus[];
};

const initialState: OrderStatusActionState = {};

export function OrderStatusForm({ orderId, allowedNextStatuses }: OrderStatusFormProps) {
  const [state, formAction, pending] = useActionState(updateOrderStatusAction, initialState);

  if (allowedNextStatuses.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        This order is in a terminal status. No further transitions are available.
      </p>
    );
  }

  return (
    <form action={formAction} className="space-y-3">
      <input type="hidden" name="orderId" value={orderId} />

      <div className="space-y-1.5">
        <Label htmlFor="toStatus">Next status</Label>
        <select
          id="toStatus"
          name="toStatus"
          required
          defaultValue={allowedNextStatuses[0]}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm capitalize"
        >
          {allowedNextStatuses.map((status) => (
            <option key={status} value={status}>
              {status.replaceAll("_", " ")}
            </option>
          ))}
        </select>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="note">Note (optional)</Label>
        <Textarea id="note" name="note" rows={3} placeholder="Internal note for this transition" />
      </div>

      {state.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      {state.success ? (
        <p className="text-sm text-emerald-700">Status updated.</p>
      ) : null}

      <Button type="submit" disabled={pending}>
        {pending ? "Updating…" : "Update status"}
      </Button>
    </form>
  );
}
