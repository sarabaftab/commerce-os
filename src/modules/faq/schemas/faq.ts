import { z } from "zod";

export const FAQ_QUESTION_MAX = 240;
export const FAQ_ANSWER_MAX = 4000;

export const faqFormSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(FAQ_QUESTION_MAX),
  answer: z.string().trim().min(1, "Answer is required").max(FAQ_ANSWER_MAX),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean(),
});

export type FaqFormValues = z.infer<typeof faqFormSchema>;

export function faqFormToCreateInput(values: FaqFormValues, tenantId: string) {
  return {
    tenantId,
    question: values.question,
    answer: values.answer,
    sortOrder: values.sortOrder,
    isActive: values.isActive,
  };
}

export function faqFormToUpdateInput(
  values: FaqFormValues,
  tenantId: string,
  faqId: string,
) {
  return {
    ...faqFormToCreateInput(values, tenantId),
    faqId,
  };
}
