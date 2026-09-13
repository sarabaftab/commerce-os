import { getStorefrontFaqs } from "@/modules/faq";
import { FaqAccordion } from "@/modules/faq/components/faq-accordion";
import { FaqPageHeading } from "@/modules/faq/components/faq-page-heading";
import { resolveStorefrontTenant } from "@/modules/storefront";

/** Public FAQ ISR — aligned with FAQ data-cache TTL. */
export const revalidate = 60;

type FaqPageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StorefrontFaqPage({ params }: FaqPageProps) {
  const { tenantSlug } = await params;
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const faqs = await getStorefrontFaqs(tenant.id);

  return (
    <div className="space-y-5 pt-4">
      <FaqPageHeading storeName={tenant.name} />
      <FaqAccordion faqs={faqs} />
    </div>
  );
}
