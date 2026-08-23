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

function formatNotificationError(code: string) {
  if (code === "401") {
    return "Telegram rejected the bot token. On Vercel, set TELEGRAM_BOT_TOKEN (the BotFather token) for Production, redeploy, then Retry.";
  }
  if (code === "403") {
    return "Telegram blocked the message. The customer must open this shop from this bot once, or they blocked the bot.";
  }
  if (code === "NO_BOT_TOKEN") {
    return "No bot token is configured for this tenant slug.";
  }
  if (code === "NO_IDENTITY") {
    return "This customer has no linked Telegram account.";
  }
  return `Could not send (${code})`;
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
          <p className="text-destructive">{formatNotificationError(latest.errorCode)}</p>
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
