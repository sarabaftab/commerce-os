import { describe, expect, it } from "vitest";

import {
  buildAccountOrderWebAppUrl,
  buildOrderPlacedTelegramMessage,
  buildOrderStatusTelegramMessage,
  customerFulfillmentLabel,
  customerPaymentLabel,
  shouldNotifyOrderStatus,
} from "@/modules/notifications/templates/order-status";

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

describe("order status telegram copy", () => {
  it("includes the order number and omits internal notes", () => {
    const message = buildOrderStatusTelegramMessage({
      orderNumber: "BIL-1042",
      storeName: "KIN A2",
      toStatus: "confirmed",
      fulfillmentMethod: "delivery",
      pickupLocationName: null,
      pickupLocationAddress: null,
    });
    expect(message.text).toContain("BIL-1042");
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
