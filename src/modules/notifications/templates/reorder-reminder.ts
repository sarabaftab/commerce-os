import { parseLocale, type Locale } from "@/shared/i18n/locale";

export type ReorderReminderMessage = {
  text: string;
  buttonText: string;
};

export function buildReorderWebAppUrl(input: {
  appUrl: string;
  tenantSlug: string;
  orderNumber: string;
}): string {
  const base = input.appUrl.replace(/\/$/, "");
  return `${base}/${input.tenantSlug}/account/reorder/${encodeURIComponent(input.orderNumber)}`;
}

export function buildLocalizedReorderReminderMessage(input: {
  locale?: string | null;
  storeName: string;
  orderNumber: string;
}): ReorderReminderMessage {
  const locale = parseLocale(input.locale) as Locale;
  const n = input.orderNumber;
  const store = input.storeName.trim() || "our store";

  if (locale === "km") {
    return {
      text: [
        "ដល់ពេលបញ្ជាទិញម្ដងទៀតហើយ?",
        "",
        `ការបញ្ជាទិញ #${n} របស់អ្នកពីមុនអាចបញ្ជាទិញម្ដងទៀតបានយ៉ាងងាយ។`,
        "ចុចខាងក្រោមដើម្បីពិនិត្យទំនិញ និងតម្លៃបច្ចុប្បន្ន មុនបញ្ជាទិញថ្មី។",
        "",
        store,
      ].join("\n"),
      buttonText: "បញ្ជាទិញម្ដងទៀត",
    };
  }

  return {
    text: [
      "Time to reorder?",
      "",
      `Your previous order #${n} is ready for a quick reorder.`,
      "Tap below to review the items at today’s availability and pricing before placing a new order.",
      "",
      store,
    ].join("\n"),
    buttonText: "Reorder",
  };
}
