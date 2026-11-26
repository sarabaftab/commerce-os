import { describe, expect, it } from "vitest";

import {
  buildLocalizedReorderReminderMessage,
  buildReorderWebAppUrl,
} from "@/modules/notifications/templates/reorder-reminder";

describe("reorder reminder message", () => {
  it("builds an authorized Mini App reorder deep link", () => {
    expect(
      buildReorderWebAppUrl({
        appUrl: "https://shop.example/",
        tenantSlug: "kin-a2",
        orderNumber: "KIN-A2-000100",
      }),
    ).toBe("https://shop.example/kin-a2/account/reorder/KIN-A2-000100");
  });

  it("localizes English and Khmer copy with a Reorder CTA", () => {
    const en = buildLocalizedReorderReminderMessage({
      locale: "en",
      storeName: "KIN A2",
      orderNumber: "KIN-A2-000100",
    });
    expect(en.buttonText).toBe("Reorder");
    expect(en.text).toContain("KIN-A2-000100");
    expect(en.text.toLowerCase()).toContain("reorder");

    const km = buildLocalizedReorderReminderMessage({
      locale: "km",
      storeName: "KIN A2",
      orderNumber: "KIN-A2-000100",
    });
    expect(km.buttonText).toBe("បញ្ជាទិញម្ដងទៀត");
    expect(km.text).toContain("KIN-A2-000100");
  });
});
