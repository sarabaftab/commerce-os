import type { Faq, Prisma } from "@prisma/client";

import { prisma } from "@/shared/db/prisma";

import type { AdminFaqListRow } from "../types";

export async function listFaqsForAdmin(tenantId: string): Promise<AdminFaqListRow[]> {
  return prisma.faq.findMany({
    where: { tenantId },
    select: {
      id: true,
      question: true,
      answer: true,
      sortOrder: true,
      isActive: true,
      updatedAt: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { question: "asc" }],
  });
}

export async function listActiveFaqs(tenantId: string) {
  return prisma.faq.findMany({
    where: { tenantId, isActive: true },
    select: {
      id: true,
      question: true,
      answer: true,
    },
    orderBy: [{ sortOrder: "asc" }, { createdAt: "asc" }, { question: "asc" }],
  });
}

export async function findFaqById(tenantId: string, faqId: string): Promise<Faq | null> {
  return prisma.faq.findFirst({
    where: { id: faqId, tenantId },
  });
}

export async function createFaq(data: Prisma.FaqUncheckedCreateInput): Promise<Faq> {
  return prisma.faq.create({ data });
}

export async function updateFaq(
  faqId: string,
  tenantId: string,
  data: Prisma.FaqUncheckedUpdateInput,
): Promise<Faq> {
  const result = await prisma.faq.updateMany({
    where: { id: faqId, tenantId },
    data,
  });

  if (result.count === 0) {
    throw new Error("FAQ not found for tenant");
  }

  return prisma.faq.findFirstOrThrow({
    where: { id: faqId, tenantId },
  });
}

export async function deleteFaq(tenantId: string, faqId: string) {
  return prisma.faq.deleteMany({
    where: { id: faqId, tenantId },
  });
}
