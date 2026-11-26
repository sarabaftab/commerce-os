import { z } from "zod";

export const FEEDBACK_MIN_RATING = 1;
export const FEEDBACK_MAX_RATING = 5;
export const FEEDBACK_MAX_COMMENT_LENGTH = 1000;

/** Orders with this status are treated as delivered for feedback eligibility. */
export const FEEDBACK_ELIGIBLE_ORDER_STATUS = "completed" as const;

export const submitOrderFeedbackSchema = z.object({
  orderNumber: z.string().trim().min(1).max(64),
  rating: z.coerce
    .number()
    .int()
    .min(FEEDBACK_MIN_RATING, "Rating must be between 1 and 5")
    .max(FEEDBACK_MAX_RATING, "Rating must be between 1 and 5"),
  comment: z
    .string()
    .max(FEEDBACK_MAX_COMMENT_LENGTH, "Comment is too long")
    .optional(),
});

export type SubmitOrderFeedbackInput = {
  orderNumber: string;
  rating: number;
  comment?: string;
};

export function feedbackFormDataToObject(formData: FormData) {
  const commentRaw = String(formData.get("comment") ?? "").trim();
  return {
    orderNumber: String(formData.get("orderNumber") ?? ""),
    rating: formData.get("rating"),
    ...(commentRaw ? { comment: commentRaw } : {}),
  };
}

export function normalizeFeedbackInput(
  parsed: z.infer<typeof submitOrderFeedbackSchema>,
): SubmitOrderFeedbackInput {
  const comment = parsed.comment?.trim();
  return {
    orderNumber: parsed.orderNumber,
    rating: parsed.rating,
    ...(comment ? { comment } : {}),
  };
}
