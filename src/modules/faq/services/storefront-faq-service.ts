import { unstable_cache } from "next/cache";

import { FAQ_REVALIDATE_SECONDS, faqTag } from "../cache-tags";
import { listActiveFaqs } from "../repositories/faq-repository";

export async function getStorefrontFaqs(tenantId: string) {
  return unstable_cache(
    async () => listActiveFaqs(tenantId),
    ["storefront-faqs", tenantId],
    {
      revalidate: FAQ_REVALIDATE_SECONDS,
      tags: [faqTag(tenantId)],
    },
  )();
}
