import { beforeEach, describe, expect, it, vi } from "vitest";

const {
  prismaMock,
  findTelegramIdentityForCustomer,
  findTenantById,
  getTelegramBotTokenForTenantSlugOrNull,
  sendTelegramBotMessage,
} = vi.hoisted(() => ({
  prismaMock: {
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

import { notifyPaymentProofReviewedAfterCommit } from "@/modules/notifications/services/notification-service";
import {
  buildPaymentProofRejectedTelegramMessage,
  buildPaymentProofVerifiedTelegramMessage,
  resolvePaymentProofRejectionReason,
} from "@/modules/notifications/templates/payment-proof";

function stubConnectedOrder(overrides: Record<string, unknown> = {}) {
  prismaMock.order.findFirst.mockResolvedValue({
    id: "order-a",
    customerId: "customer-a",
    orderNumber: "BIL-2048",
    paymentMethod: "aba_transfer",
    paymentProofStatus: "verified",
    paymentProofRejectionReason: null,
    ...overrides,
  });
  prismaMock.tenantSettings.findUnique.mockResolvedValue({
    telegramOrderNotificationsEnabled: true,
    displayName: "Billion",
  });
  findTenantById.mockResolvedValue({ id: "tenant-a", slug: "kin-a2", name: "Billion" });
  getTelegramBotTokenForTenantSlugOrNull.mockReturnValue("bot-token");
  findTelegramIdentityForCustomer.mockResolvedValue({ externalId: "998877" });
  sendTelegramBotMessage.mockResolvedValue({ ok: true });
}

describe("payment proof Telegram templates", () => {
  it("builds the Verify message with the order reference", () => {
    const message = buildPaymentProofVerifiedTelegramMessage({ orderNumber: "BIL-2048" });
    expect(message.text).toContain("Payment Confirmed ✅");
    expect(message.text).toContain("order #BIL-2048");
    expect(message.buttonText).toBe("View Order");
  });

  it("includes the rejection reason and Upload New Proof CTA", () => {
    const message = buildPaymentProofRejectedTelegramMessage({
      orderNumber: "BIL-2048",
      rejectionReason: "Screenshot is blurry",
    });
    expect(message.text).toContain("Payment Proof Needs Attention");
    expect(message.text).toContain("order #BIL-2048");
    expect(message.text).toContain("Screenshot is blurry");
    expect(message.buttonText).toBe("Upload New Proof");
  });

  it("uses a safe generic reason when rejection reason is empty", () => {
    expect(resolvePaymentProofRejectionReason(null)).toMatch(/clearer screenshot/i);
    expect(resolvePaymentProofRejectionReason("   ")).toMatch(/clearer screenshot/i);
    const message = buildPaymentProofRejectedTelegramMessage({
      orderNumber: "BIL-1",
      rejectionReason: null,
    });
    expect(message.text).not.toContain("null");
    expect(message.text).toMatch(/clearer screenshot/i);
  });

  it("uses the Khmer generic reason for Khmer customers", () => {
    expect(resolvePaymentProofRejectionReason(null, "km")).toBe(
      "សូមបង្ហោះរូបភាពបញ្ជាក់ការបង់ប្រាក់ម្ដងទៀត",
    );
    expect(
      resolvePaymentProofRejectionReason(
        "Please upload a clearer screenshot of your successful ABA transfer.",
        "km",
      ),
    ).toBe("សូមបង្ហោះរូបភាពបញ្ជាក់ការបង់ប្រាក់ម្ដងទៀត");
    expect(resolvePaymentProofRejectionReason("Amount does not match", "km")).toBe(
      "Amount does not match",
    );
  });
});

describe("notifyPaymentProofReviewedAfterCommit", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it("sends exactly one Verify notification for a Telegram-connected customer", async () => {
    stubConnectedOrder({ paymentProofStatus: "verified" });

    await notifyPaymentProofReviewedAfterCommit({
      tenantId: "tenant-a",
      orderId: "order-a",
      outcome: "verified",
    });

    expect(prismaMock.order.findFirst).toHaveBeenCalledWith({
      where: { id: "order-a", tenantId: "tenant-a" },
      select: expect.any(Object),
    });
    expect(findTelegramIdentityForCustomer).toHaveBeenCalledWith({
      tenantId: "tenant-a",
      customerId: "customer-a",
    });
    expect(sendTelegramBotMessage).toHaveBeenCalledTimes(1);
    const payload = sendTelegramBotMessage.mock.calls[0][0];
    expect(payload.chatId).toBe("998877");
    expect(payload.text).toContain("Payment Confirmed ✅");
    expect(payload.text).toContain("order #BIL-2048");
    expect(payload.buttonText).toBe("View Order");
    expect(payload.webAppUrl).toBe("https://shop.example/kin-a2/account/orders/BIL-2048");
  });

  it("sends exactly one Reject notification including the reason", async () => {
    stubConnectedOrder({
      paymentProofStatus: "rejected",
      paymentProofRejectionReason: "Amount does not match",
    });

    await notifyPaymentProofReviewedAfterCommit({
      tenantId: "tenant-a",
      orderId: "order-a",
      outcome: "rejected",
      rejectionReason: "Amount does not match",
    });

    expect(sendTelegramBotMessage).toHaveBeenCalledTimes(1);
    const payload = sendTelegramBotMessage.mock.calls[0][0];
    expect(payload.chatId).toBe("998877");
    expect(payload.text).toContain("Payment Proof Needs Attention");
    expect(payload.text).toContain("order #BIL-2048");
    expect(payload.text).toContain("Amount does not match");
    expect(payload.buttonText).toBe("Upload New Proof");
  });

  it("sends a fully Khmer Reject notification with the generic reason", async () => {
    stubConnectedOrder({
      paymentProofStatus: "rejected",
      paymentProofRejectionReason: null,
      customerLocale: "km",
    });

    await notifyPaymentProofReviewedAfterCommit({
      tenantId: "tenant-a",
      orderId: "order-a",
      outcome: "rejected",
      rejectionReason: null,
    });

    expect(sendTelegramBotMessage).toHaveBeenCalledTimes(1);
    const payload = sendTelegramBotMessage.mock.calls[0][0];
    expect(payload.text).toContain("សូមពិនិត្យមើលការបញ្ជាក់ការបង់ប្រាក់");
    expect(payload.text).toContain("សូមបង្ហោះរូបភាពបញ្ជាក់ការបង់ប្រាក់ម្ដងទៀត");
    expect(payload.text).not.toContain("Payment Proof Needs Attention");
    expect(payload.text).not.toMatch(/clearer screenshot/i);
  });

  it("skips Telegram send when the customer has no Telegram identity", async () => {
    stubConnectedOrder({ paymentProofStatus: "verified" });
    findTelegramIdentityForCustomer.mockResolvedValue(null);

    await notifyPaymentProofReviewedAfterCommit({
      tenantId: "tenant-a",
      orderId: "order-a",
      outcome: "verified",
    });

    expect(sendTelegramBotMessage).not.toHaveBeenCalled();
  });

  it("does not throw when Telegram delivery fails", async () => {
    stubConnectedOrder({ paymentProofStatus: "rejected" });
    sendTelegramBotMessage.mockResolvedValue({ ok: false, errorCode: "403:blocked" });

    await expect(
      notifyPaymentProofReviewedAfterCommit({
        tenantId: "tenant-a",
        orderId: "order-a",
        outcome: "rejected",
        rejectionReason: "Unreadable",
      }),
    ).resolves.toBeUndefined();

    expect(sendTelegramBotMessage).toHaveBeenCalledTimes(1);
  });

  it("does not send when the order belongs to another tenant lookup", async () => {
    prismaMock.order.findFirst.mockResolvedValue(null);

    await notifyPaymentProofReviewedAfterCommit({
      tenantId: "tenant-a",
      orderId: "order-b",
      outcome: "verified",
    });

    expect(sendTelegramBotMessage).not.toHaveBeenCalled();
    expect(findTelegramIdentityForCustomer).not.toHaveBeenCalled();
  });

  it("does not send when payment proof status does not match the outcome", async () => {
    stubConnectedOrder({ paymentProofStatus: "submitted" });

    await notifyPaymentProofReviewedAfterCommit({
      tenantId: "tenant-a",
      orderId: "order-a",
      outcome: "verified",
    });

    expect(sendTelegramBotMessage).not.toHaveBeenCalled();
  });
});
