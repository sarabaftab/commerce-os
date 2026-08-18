import { AppError } from "@/shared/errors/app-error";

import {
  createFaq,
  deleteFaq,
  findFaqById,
  listFaqsForAdmin,
  updateFaq,
} from "../repositories/faq-repository";
import type { CreateFaqInput, UpdateFaqInput } from "../types";

export async function getAdminFaqs(tenantId: string) {
  return listFaqsForAdmin(tenantId);
}

export async function getFaqForTenant(tenantId: string, faqId: string) {
  const faq = await findFaqById(tenantId, faqId);
  if (!faq) {
    throw new AppError("NOT_FOUND", "FAQ not found");
  }
  return faq;
}

export async function createFaqForTenant(input: CreateFaqInput) {
  return createFaq({
    tenantId: input.tenantId,
    question: input.question,
    answer: input.answer,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive,
  });
}

export async function updateFaqForTenant(input: UpdateFaqInput) {
  await getFaqForTenant(input.tenantId, input.faqId);

  return updateFaq(input.faqId, input.tenantId, {
    question: input.question,
    answer: input.answer,
    sortOrder: input.sortOrder ?? 0,
    isActive: input.isActive,
  });
}

export async function deleteFaqForTenant(tenantId: string, faqId: string) {
  await getFaqForTenant(tenantId, faqId);
  const result = await deleteFaq(tenantId, faqId);
  if (result.count === 0) {
    throw new AppError("NOT_FOUND", "FAQ not found");
  }
}
