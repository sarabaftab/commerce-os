import type { PublicFaq, FaqRecord } from "./types";

/** Pure public projection — inactive rows stay hidden; no admin-only fields. */
export function selectPublicFaqs(faqs: FaqRecord[]): PublicFaq[] {
  return faqs
    .filter((faq) => faq.isActive)
    .slice()
    .sort((a, b) => {
      if (a.sortOrder !== b.sortOrder) {
        return a.sortOrder - b.sortOrder;
      }
      const created = a.createdAt.getTime() - b.createdAt.getTime();
      if (created !== 0) {
        return created;
      }
      return a.question.localeCompare(b.question);
    })
    .map((faq) => ({
      id: faq.id,
      question: faq.question,
      answer: faq.answer,
    }));
}

export function assertFaqTenantScope(faqTenantId: string, sessionTenantId: string) {
  return faqTenantId === sessionTenantId;
}
