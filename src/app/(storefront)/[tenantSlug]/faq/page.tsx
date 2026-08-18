import { getStorefrontFaqs } from "@/modules/faq";
import { FaqAccordion } from "@/modules/faq/components/faq-accordion";
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
      <div>
        <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          FAQ
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
          Answers for {tenant.name}
        </p>
      </div>
      <FaqAccordion faqs={faqs} />
    </div>
  );
}
