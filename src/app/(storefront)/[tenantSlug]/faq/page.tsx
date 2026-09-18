import { getStorefrontFaqs } from "@/modules/faq";
import { FaqAccordion } from "@/modules/faq/components/faq-accordion";
import { FaqSupportFallback } from "@/modules/faq/components/faq-support-fallback";
import { getStorefrontSettings } from "@/modules/settings";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { LocalizedFaqHeading } from "@/ui/storefront/localized-text";

/** Public FAQ ISR — aligned with FAQ data-cache TTL. */
export const revalidate = 60;

type FaqPageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StorefrontFaqPage({ params }: FaqPageProps) {
  const { tenantSlug } = await params;
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const [faqs, settings] = await Promise.all([
    getStorefrontFaqs(tenant.id),
    getStorefrontSettings(tenant.id, tenantSlug),
  ]);

  return (
    <div className="space-y-5 pt-4">
      <LocalizedFaqHeading tenantName={tenant.name} />
      <FaqAccordion faqs={faqs} />
      <FaqSupportFallback telegramSupportUsername={settings.telegramSupportUsername} />
    </div>
  );
}
