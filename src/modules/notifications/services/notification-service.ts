import { Prisma } from "@prisma/client";
import type { OrderStatus } from "@prisma/client";

import { getTelegramBotTokenForTenantSlugOrNull } from "@/channels/telegram/server/bot-config";
import { sendTelegramBotMessage } from "@/channels/telegram/server/telegram-bot-api";
import { findTelegramIdentityForCustomer } from "@/modules/customers/repositories/customer-repository";
import { findTenantById } from "@/modules/identity/repositories/tenant-repository";
import { env } from "@/shared/config/env";
import { prisma } from "@/shared/db/prisma";
import { AppError } from "@/shared/errors/app-error";

import {
  buildAccountOrderWebAppUrl,
  buildOrderStatusTelegramMessage,
  shouldNotifyOrderStatus,
} from "../templates/order-status";

function logNotification(fields: {
  tenantId: string;
  orderId: string;
  type: string;
  channel: string;
  outcome: string;
  telegramErrorCode?: string | null;
  reason?: string;
}) {
  console.info("[notifications]", {
    tenantId: fields.tenantId,
    orderId: fields.orderId,
    type: fields.type,
    channel: fields.channel,
    outcome: fields.outcome,
    ...(fields.telegramErrorCode ? { telegramErrorCode: fields.telegramErrorCode } : {}),
    ...(fields.reason ? { reason: fields.reason } : {}),
  });
}

export async function enqueueOrderStatusNotification(
  tx: Prisma.TransactionClient,
  input: {
    tenantId: string;
    customerId: string;
    orderId: string;
    toStatus: OrderStatus;
  },
): Promise<void> {
  if (!shouldNotifyOrderStatus(input.toStatus)) {
    return;
  }

  try {
    await tx.customerNotification.create({
      data: {
        tenantId: input.tenantId,
        customerId: input.customerId,
        orderId: input.orderId,
        channel: "telegram",
        type: "order_status",
        toStatus: input.toStatus,
        status: "pending",
      },
    });
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002") {
      return;
    }
    throw error;
  }
}

export async function deliverOrderStatusNotification(input: {
  tenantId: string;
  orderId: string;
  toStatus: OrderStatus;
}): Promise<void> {
  if (!shouldNotifyOrderStatus(input.toStatus)) {
    return;
  }

  const notification = await prisma.customerNotification.findUnique({
    where: {
      orderId_channel_type_toStatus: {
        orderId: input.orderId,
        channel: "telegram",
        type: "order_status",
        toStatus: input.toStatus,
      },
    },
  });

  if (!notification || notification.tenantId !== input.tenantId) {
    return;
  }
  if (notification.status === "sent") {
    return;
  }

  logNotification({
    tenantId: input.tenantId,
    orderId: input.orderId,
    type: "order_status",
    channel: "telegram",
    outcome: "attempted",
  });

  const order = await prisma.order.findFirst({
    where: { id: input.orderId, tenantId: input.tenantId },
  });
  if (!order) {
    await markFailed(notification.id, "ORDER_NOT_FOUND");
    return;
  }

  const settings = await prisma.tenantSettings.findUnique({
    where: { tenantId: input.tenantId },
  });
  if (settings && settings.telegramOrderNotificationsEnabled === false) {
    logNotification({
      tenantId: input.tenantId,
      orderId: input.orderId,
      type: "order_status",
      channel: "telegram",
      outcome: "skipped",
      reason: "disabled",
    });
    await markFailed(notification.id, "DISABLED");
    return;
  }

  const tenant = await findTenantById(input.tenantId);
  if (!tenant) {
    await markFailed(notification.id, "TENANT_NOT_FOUND");
    return;
  }

  const botToken = getTelegramBotTokenForTenantSlugOrNull(tenant.slug);
  if (!botToken) {
    logNotification({
      tenantId: input.tenantId,
      orderId: input.orderId,
      type: "order_status",
      channel: "telegram",
      outcome: "skipped",
      reason: "no_bot_token",
    });
    await markFailed(notification.id, "NO_BOT_TOKEN");
    return;
  }

  const identity = await findTelegramIdentityForCustomer({
    tenantId: input.tenantId,
    customerId: order.customerId,
  });
  if (!identity?.externalId) {
    logNotification({
      tenantId: input.tenantId,
      orderId: input.orderId,
      type: "order_status",
      channel: "telegram",
      outcome: "skipped",
      reason: "no_telegram_identity",
    });
    await markFailed(notification.id, "NO_IDENTITY");
    return;
  }

  const message = buildOrderStatusTelegramMessage({
    orderNumber: order.orderNumber,
    storeName: settings?.displayName?.trim() || tenant.name,
    toStatus: input.toStatus,
    fulfillmentMethod: order.fulfillmentMethod,
    pickupLocationName: order.pickupLocationName,
    pickupLocationAddress: order.pickupLocationAddress,
  });

  const webAppUrl = buildAccountOrderWebAppUrl({
    appUrl: env().NEXT_PUBLIC_APP_URL,
    tenantSlug: tenant.slug,
    orderNumber: order.orderNumber,
  });

  const result = await sendTelegramBotMessage({
    botToken,
    chatId: identity.externalId,
    text: message.text,
    webAppUrl,
    buttonText: message.buttonText,
  });

  const attemptCount = notification.attemptCount + 1;
  if (result.ok) {
    await prisma.customerNotification.update({
      where: { id: notification.id },
      data: {
        status: "sent",
        recipientExternalId: identity.externalId,
        attemptCount,
        lastAttemptAt: new Date(),
        sentAt: new Date(),
        errorCode: null,
      },
    });
    logNotification({
      tenantId: input.tenantId,
      orderId: input.orderId,
      type: "order_status",
      channel: "telegram",
      outcome: "sent",
    });
    return;
  }

  await prisma.customerNotification.update({
    where: { id: notification.id },
    data: {
      status: "failed",
      recipientExternalId: identity.externalId,
      attemptCount,
      lastAttemptAt: new Date(),
      errorCode: result.errorCode,
    },
  });
  logNotification({
    tenantId: input.tenantId,
    orderId: input.orderId,
    type: "order_status",
    channel: "telegram",
    outcome: "failed",
    telegramErrorCode: result.errorCode,
  });
}

async function markFailed(id: string, errorCode: string) {
  await prisma.customerNotification.update({
    where: { id },
    data: {
      status: "failed",
      attemptCount: { increment: 1 },
      lastAttemptAt: new Date(),
      errorCode,
    },
  });
}

export async function retryCustomerNotification(input: {
  tenantId: string;
  notificationId: string;
}): Promise<void> {
  const notification = await prisma.customerNotification.findFirst({
    where: { id: input.notificationId, tenantId: input.tenantId },
  });
  if (!notification) {
    throw new AppError("NOT_FOUND", "Notification not found");
  }
  if (notification.status === "sent") {
    return;
  }
  if (notification.type !== "order_status" || notification.channel !== "telegram") {
    throw new AppError("VALIDATION", "This notification cannot be retried");
  }

  logNotification({
    tenantId: input.tenantId,
    orderId: notification.orderId,
    type: notification.type,
    channel: notification.channel,
    outcome: "retry",
  });

  await prisma.customerNotification.update({
    where: { id: notification.id },
    data: { status: "pending" },
  });

  await deliverOrderStatusNotification({
    tenantId: notification.tenantId,
    orderId: notification.orderId,
    toStatus: notification.toStatus,
  });
}

export async function listOrderNotifications(tenantId: string, orderId: string) {
  return prisma.customerNotification.findMany({
    where: { tenantId, orderId },
    orderBy: { createdAt: "desc" },
  });
}
