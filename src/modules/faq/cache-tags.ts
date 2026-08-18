/** Tenant-scoped Next.js data-cache tags for public FAQs. */
export function faqTag(tenantId: string) {
  return `faq:${tenantId}`;
}

export const FAQ_REVALIDATE_SECONDS = 60;

export function faqRevalidationTargets(tenantId: string, tenantSlug: string) {
  return {
    tag: faqTag(tenantId),
    paths: [`/${tenantSlug}/faq`] as const,
  };
}
