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

  it("uses exact client-provided Khmer for Shop / All / All products / See all / 1+1", () => {
    expect(t("km", "shop")).toBe("ធ្វើការទិញទំនិញ");
    expect(t("km", "all")).toBe("ទំនិញទំាងអស់");
    expect(t("km", "allProducts")).toBe("ទំនិញទំាងអស់");
    expect(t("km", "seeAll")).toBe("មើលទំនិញទាំងអស់");
    expect(t("km", "bogoBadge")).toBe("ប្រូម៉ូសិន 1 ថែម 1");
    expect(t("en", "shop")).toBe("Shop");
    expect(t("en", "bogoBadge")).toBe("1+1 Promotion");
  });
});

describe("localizedValue", () => {
  it("uses Khmer when present and falls back to English otherwise", () => {
    expect(
      localizedValue({ locale: "km", en: "Hello", km: "សួស្តី" }),
    ).toBe("សួស្តី");
    expect(localizedValue({ locale: "km", en: "Hello", km: null })).toBe("Hello");
    expect(localizedValue({ locale: "km", en: "Hello", km: "  " })).toBe("Hello");
    expect(localizedValue({ locale: "km", en: "Hello", km: undefined })).toBe("Hello");
    expect(localizedValue({ locale: "en", en: "Hello", km: "សួស្តី" })).toBe("Hello");
  });

  it("allows independent name vs description fallback", () => {
    const name = localizedValue({
      locale: "km",
      en: "Vigor Extra Cool",
      km: "ភេសជ្ជៈប៉ូវកម្លាំង Vigor (ប្រភេទ Extra Cool)",
    });
    const description = localizedValue({
      locale: "km",
      en: "English description",
      km: null,
    });
    expect(name).toContain("Vigor");
    expect(description).toBe("English description");
  });
});
