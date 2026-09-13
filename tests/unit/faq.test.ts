import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";

import { FaqAccordion } from "@/modules/faq/components/faq-accordion";
import {
  FAQ_ANSWER_MAX,
  FAQ_QUESTION_MAX,
  faqFormSchema,
  faqFormToCreateInput,
  faqFormToUpdateInput,
} from "@/modules/faq/schemas/faq";
import { faqRevalidationTargets, faqTag } from "@/modules/faq/cache-tags";
import { assertFaqTenantScope, selectPublicFaqs } from "@/modules/faq/select-public";
import type { FaqRecord } from "@/modules/faq/types";

function record(overrides: Partial<FaqRecord>): FaqRecord {
  return {
    id: "faq-1",
    tenantId: "tenant-a",
    question: "How do I order?",
    answer: "Use the shop and checkout.",
    isActive: true,
    sortOrder: 0,
    createdAt: new Date("2026-01-01T00:00:00.000Z"),
    ...overrides,
  };
}

describe("faqFormSchema", () => {
  it("accepts a valid FAQ", () => {
    const parsed = faqFormSchema.safeParse({
      question: "Do you deliver?",
      answer: "Yes, in Phnom Penh.",
      sortOrder: "2",
      isActive: true,
    });
    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.sortOrder).toBe(2);
    }
  });

  it("requires question and answer", () => {
    const parsed = faqFormSchema.safeParse({
      question: "  ",
      answer: "",
      sortOrder: "0",
      isActive: true,
    });
    expect(parsed.success).toBe(false);
  });

  it("rejects oversized fields and non-integer sort order", () => {
    const tooLong = faqFormSchema.safeParse({
      question: "x".repeat(FAQ_QUESTION_MAX + 1),
      answer: "y".repeat(FAQ_ANSWER_MAX + 1),
      sortOrder: "1.5",
      isActive: false,
    });
    expect(tooLong.success).toBe(false);
  });
});

describe("faqFormToCreateInput", () => {
  it("scopes create input to the session tenant, not a client tenantId", () => {
    const values = faqFormSchema.parse({
      question: "Hours?",
      answer: "9–5",
      sortOrder: 1,
      isActive: true,
    });
    const input = faqFormToCreateInput(values, "session-tenant");
    expect(input.tenantId).toBe("session-tenant");
    expect(input).not.toHaveProperty("faqId");
  });

  it("maps update fields including faqId from the server", () => {
    const values = faqFormSchema.parse({
      question: "Hours?",
      answer: "9–5",
      sortOrder: 1,
      isActive: false,
    });
    const input = faqFormToUpdateInput(values, "session-tenant", "faq-99");
    expect(input.tenantId).toBe("session-tenant");
    expect(input.faqId).toBe("faq-99");
    expect(input.isActive).toBe(false);
  });
});

describe("selectPublicFaqs", () => {
  it("hides inactive FAQs", () => {
    const publicFaqs = selectPublicFaqs([
      record({ id: "a", isActive: true, question: "Visible" }),
      record({ id: "b", isActive: false, question: "Hidden" }),
    ]);
    expect(publicFaqs).toHaveLength(1);
    expect(publicFaqs[0]?.id).toBe("a");
    expect(publicFaqs[0]).toEqual({
      id: "a",
      question: "Visible",
      answer: "Use the shop and checkout.",
    });
  });

  it("orders by sortOrder then createdAt then question", () => {
    const publicFaqs = selectPublicFaqs([
      record({
        id: "late",
        sortOrder: 1,
        createdAt: new Date("2026-02-01"),
        question: "B",
      }),
      record({
        id: "early",
        sortOrder: 1,
        createdAt: new Date("2026-01-01"),
        question: "A",
      }),
      record({
        id: "first",
        sortOrder: 0,
        createdAt: new Date("2026-03-01"),
        question: "Z",
      }),
    ]);
    expect(publicFaqs.map((faq) => faq.id)).toEqual(["first", "early", "late"]);
  });

  it("returns an empty list when none are active", () => {
    expect(
      selectPublicFaqs([record({ isActive: false })]),
    ).toEqual([]);
  });
});

describe("tenant isolation helpers", () => {
  it("does not treat another tenant as in-scope", () => {
    expect(assertFaqTenantScope("tenant-a", "tenant-b")).toBe(false);
    expect(assertFaqTenantScope("tenant-a", "tenant-a")).toBe(true);
  });

  it("uses distinct cache tags per tenant", () => {
    expect(faqTag("t1")).toBe("faq:t1");
    expect(faqTag("t1")).not.toBe(faqTag("t2"));
  });

  it("revalidates only the tenant FAQ path", () => {
    expect(faqRevalidationTargets("tid", "kin-a2")).toEqual({
      tag: "faq:tid",
      paths: ["/kin-a2/faq"],
    });
  });
});

describe("FaqAccordion", () => {
  it("renders the empty state", () => {
    const html = renderToStaticMarkup(createElement(FaqAccordion, { faqs: [] }));
    expect(html).toContain("No FAQs are available yet.");
    expect(html).not.toContain("<details");
  });

  it("renders accessible details/summary rows for active FAQs", () => {
    const html = renderToStaticMarkup(
      createElement(FaqAccordion, {
        faqs: [{ id: "1", question: "Do you deliver?", answer: "Yes, in the city." }],
      }),
    );
    expect(html).toContain("<details");
    expect(html).toContain("<summary");
    expect(html).toContain("Do you deliver?");
    expect(html).toContain("Yes, in the city.");
    expect(html).toContain("whitespace-pre-wrap");
  });
});
