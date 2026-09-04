"use client";

import { useActionState } from "react";

import type { AdminOrderDetail } from "@/modules/orders";
import {
  rejectPaymentProofAction,
  verifyPaymentProofAction,
  type PaymentProofActionState,
} from "@/modules/orders/actions/payment-proof-actions";
import { paymentProofStatusLabel } from "@/modules/orders/payment-proof";
import { Button, buttonVariants } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { cn } from "@/ui/lib/utils";

type OrderPaymentPanelProps = {
  order: AdminOrderDetail;
};

function formatPayment(method: AdminOrderDetail["paymentMethod"]) {
  return method === "cod" ? "Cash on Delivery" : "ABA Bank Transfer";
}

const initial: PaymentProofActionState = {};

export function OrderPaymentPanel({ order }: OrderPaymentPanelProps) {
  const [verifyState, verifyAction, verifyPending] = useActionState(
    verifyPaymentProofAction,
    initial,
  );
  const [rejectState, rejectAction, rejectPending] = useActionState(
    rejectPaymentProofAction,
    initial,
  );
  const pending = verifyPending || rejectPending;
  const isAba = order.paymentMethod === "aba_transfer";
  const effectiveStatus = verifyState.success
    ? "verified"
    : rejectState.success
      ? "rejected"
      : order.paymentProofStatus;
  const canReview = isAba && effectiveStatus === "submitted";
  const hasProof =
    isAba &&
    (effectiveStatus === "submitted" ||
      effectiveStatus === "verified" ||
      effectiveStatus === "rejected");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Payment</CardTitle>
      </CardHeader>
      <CardContent className="space-y-3 text-sm">
        <p className="font-medium">{formatPayment(order.paymentMethod)}</p>
        {order.paymentReference ? (
          <p className="text-muted-foreground">Reference: {order.paymentReference}</p>
        ) : (
          <p className="text-muted-foreground">No payment reference</p>
        )}
        {isAba ? (
          <p>Payment proof: {paymentProofStatusLabel(effectiveStatus)}</p>
        ) : null}
        {order.paymentProofRejectionReason ? (
          <p className="text-destructive">{order.paymentProofRejectionReason}</p>
        ) : null}

        {hasProof ? (
          <a
            href={`/admin/orders/${order.id}/payment-proof`}
            className={cn(buttonVariants({ variant: "outline", size: "sm" }))}
          >
            View proof
          </a>
        ) : null}

        {canReview ? (
          <div className="space-y-3 border-t pt-3">
            <form action={verifyAction}>
              <input type="hidden" name="orderId" value={order.id} />
              <Button type="submit" size="sm" disabled={pending}>
                {verifyPending ? "Verifying…" : "Verify payment"}
              </Button>
              {verifyState.error ? (
                <p className="mt-2 text-destructive">{verifyState.error}</p>
              ) : null}
            </form>
            <form action={rejectAction} className="space-y-2">
              <input type="hidden" name="orderId" value={order.id} />
              <Label htmlFor="reason">Customer-facing rejection reason (optional)</Label>
              <Input id="reason" name="reason" maxLength={240} />
              <Button type="submit" variant="outline" size="sm" disabled={pending}>
                {rejectPending ? "Rejecting…" : "Reject proof"}
              </Button>
              {rejectState.error ? (
                <p className="text-destructive">{rejectState.error}</p>
              ) : null}
            </form>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
