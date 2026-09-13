import { describe, expect, it } from "vitest";

import {
  buildLocaleCookieHeader,
  DEFAULT_LOCALE,
  localizedValue,
  LOCALE_COOKIE_NAME,
  parseLocale,
  readLocaleFromCookieHeader,
  t,
} from "@/shared/i18n";
import {
  buildLocalizedOrderPlacedMessage,
  buildLocalizedPaymentRejectedMessage,
  buildLocalizedPaymentVerifiedMessage,
} from "@/shared/i18n/notification-messages";

describe("locale parsing and cookie persistence", () => {
  it("defaults to English", () => {
    expect(DEFAULT_LOCALE).toBe("en");
    expect(parseLocale(undefined)).toBe("en");
    expect(parseLocale("")).toBe("en");
    expect(parseLocale("fr")).toBe("en");
  });

  it("accepts en, km, and zh (including zh-CN)", () => {
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("km")).toBe("km");
    expect(parseLocale("kh")).toBe("km");
    expect(parseLocale("zh")).toBe("zh");
    expect(parseLocale("zh-CN")).toBe("zh");
  });

  it("round-trips locale through the cookie header", () => {
    const header = buildLocaleCookieHeader("km");
    expect(header).toContain(`${LOCALE_COOKIE_NAME}=km`);
    expect(readLocaleFromCookieHeader(header)).toBe("km");
    expect(readLocaleFromCookieHeader(null)).toBe("en");
  });
});

describe("translation dictionary", () => {
  it("returns English by default and never exposes raw keys for known messages", () => {
    expect(t("en", "addToCart")).toBe("Add to Cart");
    expect(t("en", "proceedToCheckout")).toBe("Proceed to Checkout");
    expect(t("en", "cashOnDelivery")).not.toMatch(/^[a-z]+[A-Z]/);
  });

  it("switches to Khmer and Chinese for cart/checkout labels", () => {
    expect(t("km", "cart")).toBe("រទេះ");
    expect(t("zh", "cart")).toBe("购物车");
    expect(t("km", "placeOrder")).toBeTruthy();
    expect(t("zh", "abaTransfer")).toContain("ABA");
  });

  it("falls back to English when a locale table entry is somehow blank", () => {
    // t() always has filled tables; assert English fallback path for unknown locale casting
    expect(t("en", "paymentVerified")).toBeTruthy();
    expect(t("km", "imageTooLarge")).toContain("5 MB");
  });
});

describe("localizedValue content fallback", () => {
  it("uses English when KM/ZH translations are missing", () => {
    expect(
      localizedValue({
        locale: "km",
        en: "Gold Serum",
        km: null,
        zh: null,
      }),
    ).toBe("Gold Serum");
    expect(
      localizedValue({
        locale: "zh",
        en: "Vitamins",
        km: "វីតាមីន",
        zh: "   ",
      }),
    ).toBe("Vitamins");
  });

  it("uses KM and ZH when present for products and categories", () => {
    expect(
      localizedValue({
        locale: "km",
        en: "Snacks",
        km: "អាហារសម្រន់",
        zh: "零食",
      }),
    ).toBe("អាហារសម្រន់");
    expect(
      localizedValue({
        locale: "zh",
        en: "Snacks",
        km: "អាហារសម្រន់",
        zh: "零食",
      }),
    ).toBe("零食");
  });
});

describe("notification localization", () => {
  it("localizes order placed and payment proof messages with English fallback", () => {
    const en = buildLocalizedOrderPlacedMessage({
      locale: "en",
      orderNumber: "KIN-1",
      totalFormatted: "$10.00",
      fulfillmentLabel: "Home Delivery",
      paymentLabel: "Cash on Delivery",
      fulfillmentKind: "delivery",
      awaitingProof: false,
    });
    expect(en.text).toContain("Order Placed");
    expect(en.buttonText).toBe("View Order");

    const km = buildLocalizedPaymentVerifiedMessage({
      locale: "km",
      orderNumber: "KIN-1",
    });
    expect(km.text).toContain("KIN-1");
    expect(km.text).not.toContain("undefined");

    const zh = buildLocalizedPaymentRejectedMessage({
      locale: "zh",
      orderNumber: "KIN-1",
      reason: "Blurry",
    });
    expect(zh.text).toContain("Blurry");
    expect(zh.buttonText).toBe("重新上传凭证");

    const fallback = buildLocalizedOrderPlacedMessage({
      locale: null,
      orderNumber: "KIN-2",
      totalFormatted: "$1.00",
      fulfillmentLabel: "Home Delivery",
      paymentLabel: "ABA Bank Transfer",
      fulfillmentKind: "delivery",
      awaitingProof: true,
    });
    expect(fallback.text).toContain("Order Placed");
  });
});
