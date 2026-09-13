import { z } from "zod";

export const FAQ_QUESTION_MAX = 240;
export const FAQ_ANSWER_MAX = 4000;

const optionalFaqText = (max: number) =>
  z.union([z.literal(""), z.string().trim().max(max)]).optional();

export const faqFormSchema = z.object({
  question: z.string().trim().min(1, "Question is required").max(FAQ_QUESTION_MAX),
  answer: z.string().trim().min(1, "Answer is required").max(FAQ_ANSWER_MAX),
  questionKm: optionalFaqText(FAQ_QUESTION_MAX),
  answerKm: optionalFaqText(FAQ_ANSWER_MAX),
  questionZh: optionalFaqText(FAQ_QUESTION_MAX),
  answerZh: optionalFaqText(FAQ_ANSWER_MAX),
  sortOrder: z.coerce.number().int().default(0),
  isActive: z.boolean(),
});

export type FaqFormValues = z.infer<typeof faqFormSchema>;

function emptyToNull(value: string | undefined): string | null {
  return value && value.trim() ? value.trim() : null;
}

export function faqFormToCreateInput(values: FaqFormValues, tenantId: string) {
  return {
    tenantId,
    question: values.question,
    answer: values.answer,
    questionKm: emptyToNull(values.questionKm),
    answerKm: emptyToNull(values.answerKm),
    questionZh: emptyToNull(values.questionZh),
    answerZh: emptyToNull(values.answerZh),
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
