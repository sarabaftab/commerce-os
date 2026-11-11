import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import {
  assertCashOnDeliveryAllowed,
  isCashOnDeliveryEligible,
  merchandiseSubtotalAfterDiscountMinor,
} from "@/modules/orders/cod-eligibility";
import { CheckoutPaymentFields } from "@/modules/orders/components/checkout-payment-fields";
import { computeCampaignDiscountMinor } from "@/modules/promotions/discount";
import { AppError } from "@/shared/errors/app-error";
import { t } from "@/shared/i18n/messages";
import { toMinor } from "@/shared/money/money";

describe("COD eligibility (merchandise subtotal after discount, before delivery)", () => {
  it.each([
    { label: "$29.99", minor: 2999, eligible: true },
    { label: "$30.00", minor: 3000, eligible: false },
    { label: "$30.01", minor: 3001, eligible: false },
  ])("$label → COD eligible=$eligible", ({ minor, eligible }) => {
    expect(isCashOnDeliveryEligible(minor, "USD")).toBe(eligible);
  });

  it("uses promotional merchandise subtotal, not pre-discount cart total", () => {
    const subtotalMinor = toMinor(35, "USD"); // $35.00
    const discountMinor = computeCampaignDiscountMinor(subtotalMinor, {
      type: "fixed",
      value: toMinor(6, "USD"), // $6 off → $29 merchandise
    });
    const merchandise = merchandiseSubtotalAfterDiscountMinor(subtotalMinor, discountMinor);
    expect(merchandise).toBe(2900);
    expect(isCashOnDeliveryEligible(merchandise, "USD")).toBe(true);
  });

  it("ignores delivery fee when merchandise stays below $30", () => {
    const merchandise = toMinor(29, "USD");
    const deliveryFeeMinor = toMinor(1, "USD");
    const orderTotal = merchandise + deliveryFeeMinor;
    expect(orderTotal).toBe(3000);
    expect(isCashOnDeliveryEligible(merchandise, "USD")).toBe(true);
  });

  it("rejects manipulated COD >= $30 via assertCashOnDeliveryAllowed", () => {
    expect(() =>
      assertCashOnDeliveryAllowed({
        paymentMethod: "cod",
        merchandiseSubtotalMinor: 3000,
        currency: "USD",
        locale: "en",
      }),
    ).toThrow(AppError);

    try {
      assertCashOnDeliveryAllowed({
        paymentMethod: "cod",
        merchandiseSubtotalMinor: 3000,
        currency: "USD",
        locale: "en",
      });
    } catch (error) {
      expect(error).toBeInstanceOf(AppError);
      expect((error as AppError).code).toBe("VALIDATION");
      expect((error as AppError).message).toBe(t("en", "codUnavailableOverLimit"));
    }
  });

  it("allows COD below $30 and never blocks ABA", () => {
    expect(() =>
      assertCashOnDeliveryAllowed({
        paymentMethod: "cod",
        merchandiseSubtotalMinor: 2999,
        currency: "USD",
      }),
    ).not.toThrow();

    expect(() =>
      assertCashOnDeliveryAllowed({
        paymentMethod: "aba_transfer",
        merchandiseSubtotalMinor: 5000,
        currency: "USD",
      }),
    ).not.toThrow();
  });

  it("localizes the rejection message for Khmer", () => {
    try {
      assertCashOnDeliveryAllowed({
        paymentMethod: "cod",
        merchandiseSubtotalMinor: 3001,
        currency: "USD",
        locale: "km",
      });
      expect.unreachable();
    } catch (error) {
      expect((error as AppError).message).toBe(t("km", "codUnavailableOverLimit"));
    }
  });
});

describe("CheckoutPaymentFields COD limit UI", () => {
  function renderPayment(props: {
    paymentMethod: "cod" | "aba_transfer";
    codEnabled: boolean;
    codSelectable: boolean;
    abaAvailable: boolean;
  }) {
    return renderToStaticMarkup(
      createElement(CheckoutPaymentFields, {
        ...props,
        onPaymentMethodChange: () => undefined,
      }),
    );
  }

  it("keeps COD visible but disabled at/above $30 with explanation", () => {
    const html = renderPayment({
      paymentMethod: "aba_transfer",
      codEnabled: true,
      codSelectable: false,
      abaAvailable: true,
    });
    expect(html).toContain("Cash on Delivery");
    expect(html).toContain("disabled");
    expect(html).toContain(t("en", "codUnavailableOverLimit"));
    expect(html).toContain("ABA Transfer");
  });

  it("allows selecting COD below $30", () => {
    const html = renderPayment({
      paymentMethod: "cod",
      codEnabled: true,
      codSelectable: true,
      abaAvailable: true,
    });
    expect(html).toContain('value="cod"');
    expect(html).not.toContain(t("en", "codUnavailableOverLimit"));
  });
});

describe("rejected COD requests must not mutate checkout side effects", () => {
  it("assert throws before any order/cart/stock work would run", () => {
    let stockDeducted = false;
    let cartConverted = false;
    let orderCreated = false;

    try {
      assertCashOnDeliveryAllowed({
        paymentMethod: "cod",
        merchandiseSubtotalMinor: 3000,
        currency: "USD",
      });
      stockDeducted = true;
      cartConverted = true;
      orderCreated = true;
    } catch {
      // Enforcement point mirrors checkout-service: gate before deduct/claim/insert.
    }

    expect(stockDeducted).toBe(false);
    expect(cartConverted).toBe(false);
    expect(orderCreated).toBe(false);
  });
});
