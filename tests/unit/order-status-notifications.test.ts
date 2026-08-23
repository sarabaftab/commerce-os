import { describe, expect, it } from "vitest";

import {
  buildAccountOrderWebAppUrl,
  buildOrderStatusTelegramMessage,
  shouldNotifyOrderStatus,
} from "@/modules/notifications/templates/order-status";

describe("order status notification rules", () => {
  it("does not notify pending placement", () => {
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
