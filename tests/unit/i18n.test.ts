import { describe, expect, it } from "vitest";

import {
  buildLocaleCookieHeader,
  DEFAULT_LOCALE,
  localizedValue,
  LOCALE_COOKIE_NAME,
  LOCALES,
  parseLocale,
  readLocaleFromCookieHeader,
  t,
} from "@/shared/i18n";

describe("parseLocale", () => {
  it("accepts en and km", () => {
    expect(parseLocale("en")).toBe("en");
    expect(parseLocale("km")).toBe("km");
    expect(parseLocale("KM")).toBe("km");
    expect(parseLocale("kh")).toBe("km");
  });

  it("falls back unknown and zh to English (no Chinese UI)", () => {
    expect(parseLocale("zh")).toBe(DEFAULT_LOCALE);
    expect(parseLocale("zh-CN")).toBe(DEFAULT_LOCALE);
    expect(parseLocale("fr")).toBe("en");
    expect(parseLocale(undefined)).toBe("en");
    expect(parseLocale(null)).toBe("en");
    expect(LOCALES).toEqual(["en", "km"]);
    expect(LOCALES).not.toContain("zh");
  });
});

describe("locale cookie helpers", () => {
  it("reads and builds the locale cookie", () => {
    expect(readLocaleFromCookieHeader(`${LOCALE_COOKIE_NAME}=km; other=1`)).toBe("km");
    expect(readLocaleFromCookieHeader("other=1")).toBe(DEFAULT_LOCALE);
    expect(buildLocaleCookieHeader("km")).toContain(`${LOCALE_COOKIE_NAME}=km`);
  });
});

describe("t()", () => {
  it("returns English and Khmer messages with English fallback", () => {
    expect(t("en", "proceedToCheckout")).toBe("Proceed to Checkout");
    expect(t("km", "proceedToCheckout")).toBe("បន្តទៅការទូទាត់");
    expect(t("km", "account")).toBe("គណនី");
    expect(t("en", "account")).toBe("Account");
  });
});

describe("localizedValue", () => {
  it("uses Khmer when present and falls back to English otherwise", () => {
    expect(
      localizedValue({ locale: "km", en: "Hello", km: "សួស្តី" }),
    ).toBe("សួស្តី");
    expect(localizedValue({ locale: "km", en: "Hello", km: null })).toBe("Hello");
    expect(localizedValue({ locale: "km", en: "Hello", km: "  " })).toBe("Hello");
    expect(localizedValue({ locale: "en", en: "Hello", km: "សួស្តី" })).toBe("Hello");
  });
});
