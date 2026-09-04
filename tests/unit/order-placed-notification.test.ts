import { describe, expect, it, vi, beforeEach } from "vitest";

const {
  prismaMock,
  findTelegramIdentityForCustomer,
  findTenantById,
  getTelegramBotTokenForTenantSlugOrNull,
  sendTelegramBotMessage,
} = vi.hoisted(() => ({
  prismaMock: {
    customerNotification: {
      create: vi.fn(),
      findUnique: vi.fn(),
      update: vi.fn(),
    },
    order: {
      findFirst: vi.fn(),
    },
    tenantSettings: {
      findUnique: vi.fn(),
    },
  },
  findTelegramIdentityForCustomer: vi.fn(),
  findTenantById: vi.fn(),
  getTelegramBotTokenForTenantSlugOrNull: vi.fn(),
  sendTelegramBotMessage: vi.fn(),
}));

vi.mock("@/shared/db/prisma", () => ({
  prisma: prismaMock,
}));

vi.mock("@/modules/customers/repositories/customer-repository", () => ({
  findTelegramIdentityForCustomer,
}));

vi.mock("@/modules/identity/repositories/tenant-repository", () => ({
  findTenantById,
}));

vi.mock("@/channels/telegram/server/bot-config", () => ({
  getTelegramBotTokenForTenantSlugOrNull,
}));

vi.mock("@/channels/telegram/server/telegram-bot-api", () => ({
  sendTelegramBotMessage,
}));

vi.mock("@/shared/config/env", () => ({
  env: () => ({ NEXT_PUBLIC_APP_URL: "https://shop.example" }),
}));

import {
  deliverOrderStatusNotification,
  enqueueOrderPlacedNotification,
  notifyOrderPlacedAfterCommit,
} from "@/modules/notifications/services/notification-service";

describe("order placed notification", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.customerNotification.update.mockResolvedValue({});
  });

  it("enqueues exactly one pending/telegram/order_status row and ignores duplicates", async () => {
    const tx = {
      customerNotification: {
        create: vi.fn().mockResolvedValueOnce({ id: "n1" }),
      },
    };

    await enqueueOrderPlacedNotification(tx as never, {
      tenantId: "tenant-a",
      customerId: "customer-a",
      orderId: "order-a",
    });

    expect(tx.customerNotification.create).toHaveBeenCalledWith({
      data: {
        tenantId: "tenant-a",
        customerId: "customer-a",
        orderId: "order-a",
        channel: "telegram",
        type: "order_status",
        toStatus: "pending",
        status: "pending",
      },
    });

    const { Prisma } = await import("@prisma/client");
    tx.customerNotification.create.mockRejectedValueOnce(
      new Prisma.PrismaClientKnownRequestError("Unique", {
        code: "P2002",
        clientVersion: "test",
      }),
    );

    await expect(
      enqueueOrderPlacedNotification(tx as never, {
        tenantId: "tenant-a",
        customerId: "customer-a",
        orderId: "order-a",
      }),
    ).resolves.toBeUndefined();
  });

  it("sends Order Placed once when Telegram identity exists", async () => {
    prismaMock.customerNotification.findUnique.mockResolvedValue({
      id: "n1",
      tenantId: "tenant-a",
      orderId: "order-a",
      status: "pending",
      attemptCount: 0,
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: "order-a",
      customerId: "customer-a",
      orderNumber: "BIL-1042",
      totalMinor: 3000,
      currency: "USD",
      fulfillmentMethod: "delivery",
      paymentMethod: "aba_transfer",
      paymentProofStatus: "awaiting_proof",
      pickupLocationName: null,
      pickupLocationAddress: null,
    });
    prismaMock.tenantSettings.findUnique.mockResolvedValue({
      telegramOrderNotificationsEnabled: true,
      displayName: "KIN A2",
    });
    findTenantById.mockResolvedValue({ id: "tenant-a", slug: "kin-a2", name: "KIN A2" });
    getTelegramBotTokenForTenantSlugOrNull.mockReturnValue("bot-token");
    findTelegramIdentityForCustomer.mockResolvedValue({ externalId: "12345" });
    sendTelegramBotMessage.mockResolvedValue({ ok: true });

    await deliverOrderStatusNotification({
      tenantId: "tenant-a",
      orderId: "order-a",
      toStatus: "pending",
    });

    expect(sendTelegramBotMessage).toHaveBeenCalledTimes(1);
    const payload = sendTelegramBotMessage.mock.calls[0][0];
    expect(payload.chatId).toBe("12345");
    expect(payload.buttonText).toBe("View Order");
    expect(payload.webAppUrl).toBe("https://shop.example/kin-a2/account/orders/BIL-1042");
    expect(payload.text).toContain("Order Placed");
    expect(payload.text).toContain("BIL-1042");
    expect(payload.text).toContain("ABA Bank Transfer");
    expect(payload.text).toContain("Home Delivery");
    expect(payload.text).not.toContain("aba_transfer");
    expect(prismaMock.customerNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { id: "n1" },
        data: expect.objectContaining({ status: "sent" }),
      }),
    );

    prismaMock.customerNotification.findUnique.mockResolvedValue({
      id: "n1",
      tenantId: "tenant-a",
      orderId: "order-a",
      status: "sent",
      attemptCount: 1,
    });
    sendTelegramBotMessage.mockClear();

    await deliverOrderStatusNotification({
      tenantId: "tenant-a",
      orderId: "order-a",
      toStatus: "pending",
    });
    expect(sendTelegramBotMessage).not.toHaveBeenCalled();
  });

  it("skips Telegram send when the customer has no Telegram identity", async () => {
    prismaMock.customerNotification.findUnique.mockResolvedValue({
      id: "n1",
      tenantId: "tenant-a",
      orderId: "order-a",
      status: "pending",
      attemptCount: 0,
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: "order-a",
      customerId: "customer-a",
      orderNumber: "BIL-1042",
      totalMinor: 3000,
      currency: "USD",
      fulfillmentMethod: "delivery",
      paymentMethod: "cod",
      paymentProofStatus: "not_required",
      pickupLocationName: null,
      pickupLocationAddress: null,
    });
    prismaMock.tenantSettings.findUnique.mockResolvedValue({
      telegramOrderNotificationsEnabled: true,
      displayName: "KIN A2",
    });
    findTenantById.mockResolvedValue({ id: "tenant-a", slug: "kin-a2", name: "KIN A2" });
    getTelegramBotTokenForTenantSlugOrNull.mockReturnValue("bot-token");
    findTelegramIdentityForCustomer.mockResolvedValue(null);

    await deliverOrderStatusNotification({
      tenantId: "tenant-a",
      orderId: "order-a",
      toStatus: "pending",
    });

    expect(sendTelegramBotMessage).not.toHaveBeenCalled();
    expect(prismaMock.customerNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ errorCode: "NO_IDENTITY" }),
      }),
    );
  });

  it("records Telegram API failure without throwing", async () => {
    prismaMock.customerNotification.findUnique.mockResolvedValue({
      id: "n1",
      tenantId: "tenant-a",
      orderId: "order-a",
      status: "pending",
      attemptCount: 0,
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: "order-a",
      customerId: "customer-a",
      orderNumber: "BIL-1042",
      totalMinor: 3000,
      currency: "USD",
      fulfillmentMethod: "pickup",
      paymentMethod: "cod",
      paymentProofStatus: "not_required",
      pickupLocationName: "Showroom",
      pickupLocationAddress: null,
    });
    prismaMock.tenantSettings.findUnique.mockResolvedValue({
      telegramOrderNotificationsEnabled: true,
      displayName: "KIN A2",
    });
    findTenantById.mockResolvedValue({ id: "tenant-a", slug: "kin-a2", name: "KIN A2" });
    getTelegramBotTokenForTenantSlugOrNull.mockReturnValue("bot-token");
    findTelegramIdentityForCustomer.mockResolvedValue({ externalId: "12345" });
    sendTelegramBotMessage.mockResolvedValue({ ok: false, errorCode: "403:blocked" });

    await expect(
      notifyOrderPlacedAfterCommit({ tenantId: "tenant-a", orderId: "order-a" }),
    ).resolves.toBeUndefined();

    expect(prismaMock.customerNotification.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({ status: "failed", errorCode: "403:blocked" }),
      }),
    );
  });

  it("still delivers confirmed notifications after order placed", async () => {
    prismaMock.customerNotification.findUnique.mockResolvedValue({
      id: "n2",
      tenantId: "tenant-a",
      orderId: "order-a",
      status: "pending",
      attemptCount: 0,
    });
    prismaMock.order.findFirst.mockResolvedValue({
      id: "order-a",
      customerId: "customer-a",
      orderNumber: "BIL-1042",
      totalMinor: 3000,
      currency: "USD",
      fulfillmentMethod: "delivery",
      paymentMethod: "cod",
      paymentProofStatus: "not_required",
      pickupLocationName: null,
      pickupLocationAddress: null,
    });
    prismaMock.tenantSettings.findUnique.mockResolvedValue({
      telegramOrderNotificationsEnabled: true,
      displayName: "KIN A2",
    });
    findTenantById.mockResolvedValue({ id: "tenant-a", slug: "kin-a2", name: "KIN A2" });
    getTelegramBotTokenForTenantSlugOrNull.mockReturnValue("bot-token");
    findTelegramIdentityForCustomer.mockResolvedValue({ externalId: "12345" });
    sendTelegramBotMessage.mockResolvedValue({ ok: true });

    await deliverOrderStatusNotification({
      tenantId: "tenant-a",
      orderId: "order-a",
      toStatus: "confirmed",
    });

    expect(sendTelegramBotMessage).toHaveBeenCalledWith(
      expect.objectContaining({
        text: expect.stringContaining("confirmed"),
      }),
    );
  });
});
