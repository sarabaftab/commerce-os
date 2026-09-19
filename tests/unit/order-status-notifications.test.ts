import { describe, expect, it, vi, beforeEach } from "vitest";

import {
  buildAccountOrderWebAppUrl,
  buildOrderPlacedTelegramMessage,
  buildOrderStatusTelegramMessage,
  customerFulfillmentLabel,
  customerPaymentLabel,
  shouldNotifyOrderStatus,
} from "@/modules/notifications/templates/order-status";
import { buildLocalizedOrderStatusMessage } from "@/shared/i18n";

const {
  prismaMock,
  findTelegramIdentityForCustomer,
  findTenantById,
  getTelegramBotTokenForTenantSlugOrNull,
  sendTelegramBotMessage,
} = vi.hoisted(() => ({
  prismaMock: {
    customerNotification: {
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

import { deliverOrderStatusNotification } from "@/modules/notifications/services/notification-service";

describe("order status notification rules", () => {
  it("does not treat pending as a status-change notification", () => {
    expect(shouldNotifyOrderStatus("pending")).toBe(false);
  });

  it("notifies customer-facing status changes", () => {
    expect(shouldNotifyOrderStatus("confirmed")).toBe(true);
    expect(shouldNotifyOrderStatus("processing")).toBe(true);
    expect(shouldNotifyOrderStatus("ready_for_pickup")).toBe(true);
    expect(shouldNotifyOrderStatus("out_for_delivery")).toBe(true);
    expect(shouldNotifyOrderStatus("completed")).toBe(true);
    expect(shouldNotifyOrderStatus("cancelled")).toBe(true);
  });
});

describe("order placed telegram copy", () => {
  it("renders friendly labels, total, and View Order", () => {
    const message = buildOrderPlacedTelegramMessage({
      orderNumber: "BIL-1042",
      totalMinor: 3000,
      currency: "USD",
      fulfillmentMethod: "delivery",
      paymentMethod: "aba_transfer",
      paymentProofStatus: "awaiting_proof",
    });

    expect(message.buttonText).toBe("View Order");
    expect(message.text).toContain("Order Placed");
    expect(message.text).toContain("BIL-1042");
    expect(message.text).toContain("$30.00");
    expect(message.text).toContain("Home Delivery");
    expect(message.text).toContain("ABA Bank Transfer");
    expect(message.text).toContain("Payment confirmation is still awaiting submission.");
    expect(message.text).toContain("We'll notify you again once your order is confirmed.");
    expect(message.text).not.toContain("aba_transfer");
    expect(message.text).not.toContain("undefined");
  });

  it("uses Cash on Delivery without ABA proof note", () => {
    const message = buildOrderPlacedTelegramMessage({
      orderNumber: "BIL-1042",
      totalMinor: 1500,
      currency: "USD",
      fulfillmentMethod: "pickup",
      paymentMethod: "cod",
      paymentProofStatus: "not_required",
    });

    expect(message.text).toContain("Showroom Pickup");
    expect(message.text).toContain("Cash on Delivery");
    expect(message.text).not.toContain("Payment confirmation");
  });

  it("maps fulfillment and payment enums to customer labels", () => {
    expect(customerFulfillmentLabel("delivery")).toBe("Home Delivery");
    expect(customerFulfillmentLabel("pickup")).toBe("Showroom Pickup");
    expect(customerPaymentLabel("aba_transfer")).toBe("ABA Bank Transfer");
    expect(customerPaymentLabel("cod")).toBe("Cash on Delivery");
  });
});

describe("order status telegram copy (English)", () => {
  it("includes the order number and omits internal notes", () => {
    const message = buildOrderStatusTelegramMessage({
      orderNumber: "KIN-A2-000104",
      storeName: "KIN A2",
      toStatus: "confirmed",
      fulfillmentMethod: "delivery",
      pickupLocationName: null,
      pickupLocationAddress: null,
      locale: "en",
    });
    expect(message.text).toContain("KIN-A2-000104");
    expect(message.text).toContain("Order #KIN-A2-000104 confirmed");
    expect(message.text.toLowerCase()).not.toContain("internal");
    expect(message.buttonText).toBe("View Order");
  });

  it("includes pickup location only for pickup orders", () => {
    const pickup = buildOrderStatusTelegramMessage({
      orderNumber: "BIL-1042",
      storeName: "KIN A2",
      toStatus: "ready_for_pickup",
      fulfillmentMethod: "pickup",
      pickupLocationName: "Warehouse A",
      pickupLocationAddress: "Street 1",
      locale: "en",
    });
    expect(pickup.text).toContain("Warehouse A");
    expect(pickup.text).toContain("Street 1");

    const delivery = buildOrderStatusTelegramMessage({
      orderNumber: "BIL-1042",
      storeName: "KIN A2",
      toStatus: "ready_for_pickup",
      fulfillmentMethod: "delivery",
      pickupLocationName: "Warehouse A",
      pickupLocationAddress: "Street 1",
      locale: "en",
    });
    expect(delivery.text).not.toContain("Warehouse A");
  });

  it("builds a session-gated account order URL from the public order number", () => {
    expect(
      buildAccountOrderWebAppUrl({
        appUrl: "https://shop.example",
        tenantSlug: "kin-a2",
        orderNumber: "BIL-1042",
      }),
    ).toBe("https://shop.example/kin-a2/account/orders/BIL-1042");
  });
});

describe("localized order status telegram copy", () => {
  const statuses = [
    "confirmed",
    "processing",
    "ready_for_pickup",
    "out_for_delivery",
    "completed",
    "cancelled",
  ] as const;

  it("uses Khmer copy for customerLocale=km while preserving the order number", () => {
    for (const toStatus of statuses) {
      const message = buildLocalizedOrderStatusMessage({
        locale: "km",
        orderNumber: "KIN-A2-000104",
        toStatus,
        fulfillmentMethod: "delivery",
      });
      expect(message.text).toContain("KIN-A2-000104");
      expect(message.text).toContain("ការបញ្ជាទិញ");
      expect(message.text).not.toMatch(/^Order #/);
      expect(message.buttonText).toBe("មើលការបញ្ជាទិញ");
    }
  });

  it("uses English copy for customerLocale=en", () => {
    for (const toStatus of statuses) {
      const message = buildLocalizedOrderStatusMessage({
        locale: "en",
        orderNumber: "KIN-A2-000104",
        toStatus,
        fulfillmentMethod: "delivery",
      });
      expect(message.text).toContain("KIN-A2-000104");
      expect(message.text).toMatch(/^Order #KIN-A2-000104/);
      expect(message.buttonText).toBe("View Order");
    }
  });

  it("falls back to English for null or invalid locale", () => {
    for (const locale of [null, undefined, "", "zh", "fr"]) {
      const message = buildLocalizedOrderStatusMessage({
        locale,
        orderNumber: "KIN-A2-000104",
        toStatus: "confirmed",
        fulfillmentMethod: "delivery",
      });
      expect(message.text).toBe(
        "Order #KIN-A2-000104 confirmed\n\nYour order has been confirmed and is now being prepared.",
      );
      expect(message.buttonText).toBe("View Order");
    }
  });

  it("localizes confirmed exactly matching the previous English production copy", () => {
    expect(
      buildLocalizedOrderStatusMessage({
        locale: "en",
        orderNumber: "KIN-A2-000104",
        toStatus: "confirmed",
        fulfillmentMethod: "delivery",
      }).text,
    ).toBe(
      "Order #KIN-A2-000104 confirmed\n\nYour order has been confirmed and is now being prepared.",
    );
  });
});

describe("deliverOrderStatusNotification locale resolution", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    prismaMock.customerNotification.update.mockResolvedValue({});
    prismaMock.tenantSettings.findUnique.mockResolvedValue({
      telegramOrderNotificationsEnabled: true,
      displayName: "KIN A2",
    });
    findTenantById.mockResolvedValue({ id: "tenant-a", slug: "kin-a2", name: "KIN A2" });
    getTelegramBotTokenForTenantSlugOrNull.mockReturnValue("bot-token");
    findTelegramIdentityForCustomer.mockResolvedValue({ externalId: "12345" });
    sendTelegramBotMessage.mockResolvedValue({ ok: true });
  });

  function stubPendingNotification() {
    prismaMock.customerNotification.findUnique.mockResolvedValue({
      id: "n1",
      tenantId: "tenant-a",
      orderId: "order-a",
      status: "pending",
      attemptCount: 0,
    });
  }

  function stubOrder(customerLocale: string | null) {
    prismaMock.order.findFirst.mockResolvedValue({
      id: "order-a",
      customerId: "customer-a",
      orderNumber: "KIN-A2-000104",
      totalMinor: 3000,
      currency: "USD",
      fulfillmentMethod: "delivery",
      paymentMethod: "cod",
      paymentProofStatus: "not_required",
      pickupLocationName: null,
      pickupLocationAddress: null,
      customerLocale,
    });
  }

  it("sends Khmer when admin confirms an order with customerLocale=km", async () => {
    stubPendingNotification();
    stubOrder("km");

    await deliverOrderStatusNotification({
      tenantId: "tenant-a",
      orderId: "order-a",
      toStatus: "confirmed",
    });

    expect(sendTelegramBotMessage).toHaveBeenCalledTimes(1);
    const payload = sendTelegramBotMessage.mock.calls[0][0];
    expect(payload.text).toContain("KIN-A2-000104");
    expect(payload.text).toContain("ត្រូវបានបញ្ជាក់");
    expect(payload.text).not.toContain("Your order has been confirmed");
    expect(payload.buttonText).toBe("មើលការបញ្ជាទិញ");
  });

  it("sends English when admin confirms an order with customerLocale=en", async () => {
    stubPendingNotification();
    stubOrder("en");

    await deliverOrderStatusNotification({
      tenantId: "tenant-a",
      orderId: "order-a",
      toStatus: "confirmed",
    });

    expect(sendTelegramBotMessage).toHaveBeenCalledTimes(1);
    const payload = sendTelegramBotMessage.mock.calls[0][0];
    expect(payload.text).toContain(
      "Your order has been confirmed and is now being prepared.",
    );
    expect(payload.buttonText).toBe("View Order");
  });

  it("falls back to English when customerLocale is null", async () => {
    stubPendingNotification();
    stubOrder(null);

    await deliverOrderStatusNotification({
      tenantId: "tenant-a",
      orderId: "order-a",
      toStatus: "processing",
    });

    expect(sendTelegramBotMessage).toHaveBeenCalledTimes(1);
    expect(sendTelegramBotMessage.mock.calls[0][0].text).toContain(
      "We are currently preparing your order.",
    );
  });

  it("does not resend when the notification row is already sent", async () => {
    prismaMock.customerNotification.findUnique.mockResolvedValue({
      id: "n1",
      tenantId: "tenant-a",
      orderId: "order-a",
      status: "sent",
      attemptCount: 1,
    });
    stubOrder("km");

    await deliverOrderStatusNotification({
      tenantId: "tenant-a",
      orderId: "order-a",
      toStatus: "confirmed",
    });

    expect(sendTelegramBotMessage).not.toHaveBeenCalled();
  });
});
