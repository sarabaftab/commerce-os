import type { PublicFaq } from "@/modules/faq";

type FaqAccordionProps = {
  faqs: PublicFaq[];
};

export function FaqAccordion({ faqs }: FaqAccordionProps) {
  if (faqs.length === 0) {
    return (
      <p className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-5 text-sm text-[color:var(--shop-ink-muted)] ring-1 ring-[color:var(--shop-line)]">
        No FAQs are available yet.
      </p>
    );
  }

  return (
    <div className="overflow-hidden rounded-2xl bg-[color:var(--shop-surface-elevated)] ring-1 ring-[color:var(--shop-line)]">
      {faqs.map((faq) => (
        <details
          key={faq.id}
          className="group border-b border-[color:var(--shop-line)] last:border-0"
        >
          <summary className="cursor-pointer list-none px-4 py-3.5 text-sm font-medium text-[color:var(--shop-ink)] outline-none marker:content-none focus-visible:bg-[color:var(--shop-surface)] [&::-webkit-details-marker]:hidden">
            <span className="flex items-start justify-between gap-3">
              <span>{faq.question}</span>
              <span
                aria-hidden
                className="mt-0.5 shrink-0 text-[color:var(--shop-ink-muted)] transition group-open:rotate-45"
              >
                +
              </span>
            </span>
          </summary>
          <div className="whitespace-pre-wrap px-4 pb-4 text-sm leading-relaxed text-[color:var(--shop-ink-muted)]">
            {faq.answer}
          </div>
        </details>
      ))}
    </div>
  );
}
