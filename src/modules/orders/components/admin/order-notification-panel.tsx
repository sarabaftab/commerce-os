"use client";

import { useActionState } from "react";
import type { NotificationDeliveryStatus, OrderStatus } from "@prisma/client";

import {
  retryOrderNotificationAction,
  type RetryNotificationActionState,
} from "@/modules/notifications/actions/retry-notification-action";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

export type AdminOrderNotification = {
  id: string;
  toStatus: OrderStatus;
  status: NotificationDeliveryStatus;
  errorCode: string | null;
};

type OrderNotificationPanelProps = {
  orderId: string;
  telegramLinked: boolean;
  notifications: AdminOrderNotification[];
};

const initial: RetryNotificationActionState = {};

function formatDelivery(status: NotificationDeliveryStatus) {
  if (status === "sent") return "Sent";
  if (status === "pending") return "Pending";
  return "Failed";
}

export function OrderNotificationPanel({
  orderId,
  telegramLinked,
  notifications,
}: OrderNotificationPanelProps) {
  const latest = notifications[0];
  const [state, action, pending] = useActionState(retryOrderNotificationAction, initial);
  const canRetry = Boolean(latest && latest.status !== "sent");

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer notification</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!telegramLinked ? (
          <p className="text-muted-foreground">Telegram — Not linked</p>
        ) : null}
        {latest ? (
          <p>
            Telegram — {formatDelivery(latest.status)}
            {` (${latest.toStatus.replaceAll("_", " ")})`}
          </p>
        ) : telegramLinked ? (
          <p className="text-muted-foreground">Telegram — No status messages yet</p>
        ) : null}
        {latest?.status === "failed" && latest.errorCode ? (
          <p className="text-destructive">Could not send ({latest.errorCode})</p>
        ) : null}
        {canRetry && latest ? (
          <form action={action}>
            <input type="hidden" name="notificationId" value={latest.id} />
            <input type="hidden" name="orderId" value={orderId} />
            <Button type="submit" size="sm" variant="outline" disabled={pending}>
              {pending ? "Retrying…" : "Retry"}
            </Button>
          </form>
        ) : null}
        {state.error ? <p className="text-destructive">{state.error}</p> : null}
      </CardContent>
    </Card>
  );
}
