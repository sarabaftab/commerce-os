"use client";

import { useActionState, useState } from "react";
import { Star } from "lucide-react";

import {
  submitOrderFeedbackAction,
  type FeedbackActionState,
} from "@/modules/orders/actions/feedback-actions";
import { FEEDBACK_MAX_COMMENT_LENGTH } from "@/modules/orders/schemas/feedback";
import { useLocale } from "@/shared/i18n";
import { Button } from "@/ui/components/ui/button";
import { Label } from "@/ui/components/ui/label";
import { Textarea } from "@/ui/components/ui/textarea";
import { cn } from "@/ui/lib/utils";

type ExistingFeedback = {
  rating: number;
  comment: string | null;
  createdAt: Date;
};

type CustomerOrderFeedbackProps = {
  tenantSlug: string;
  orderNumber: string;
  canLeaveFeedback: boolean;
  feedback: ExistingFeedback | null;
};

function StarRow({
  rating,
  interactive,
  onSelect,
}: {
  rating: number;
  interactive?: boolean;
  onSelect?: (value: number) => void;
}) {
  return (
    <div className="flex items-center gap-1" role={interactive ? "radiogroup" : undefined}>
      {[1, 2, 3, 4, 5].map((value) => {
        const filled = value <= rating;
        if (!interactive) {
          return (
            <Star
              key={value}
              className={cn(
                "size-5",
                filled
                  ? "fill-[color:var(--shop-primary)] text-[color:var(--shop-primary)]"
                  : "text-[color:var(--shop-line)]",
              )}
              aria-hidden
            />
          );
        }
        return (
          <button
            key={value}
            type="button"
            role="radio"
            aria-checked={value === rating}
            aria-label={`${value} star${value === 1 ? "" : "s"}`}
            onClick={() => onSelect?.(value)}
            className="rounded-md p-0.5 transition hover:scale-105"
          >
            <Star
              className={cn(
                "size-7",
                filled
                  ? "fill-[color:var(--shop-primary)] text-[color:var(--shop-primary)]"
                  : "text-[color:var(--shop-ink-muted)]",
              )}
            />
          </button>
        );
      })}
    </div>
  );
}

export function CustomerOrderFeedback({
  tenantSlug,
  orderNumber,
  canLeaveFeedback,
  feedback,
}: CustomerOrderFeedbackProps) {
  const { t } = useLocale();
  const [rating, setRating] = useState(feedback?.rating ?? 0);
  const [state, formAction, pending] = useActionState(
    submitOrderFeedbackAction.bind(null, tenantSlug),
    {} as FeedbackActionState,
  );

  if (feedback && !state.success) {
    return (
      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">{t("yourFeedback")}</h2>
        <div className="mt-3 space-y-2">
          <StarRow rating={feedback.rating} />
          {feedback.comment ? (
            <p className="text-sm text-[color:var(--shop-ink-muted)]">{feedback.comment}</p>
          ) : (
            <p className="text-sm text-[color:var(--shop-ink-muted)]">{t("noFeedbackComment")}</p>
          )}
        </div>
      </section>
    );
  }

  if (!canLeaveFeedback && !state.success) {
    return null;
  }

  if (state.success) {
    return (
      <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
        <h2 className="text-sm font-semibold">{t("yourFeedback")}</h2>
        <p className="mt-2 text-sm text-[color:var(--shop-ink-muted)]">{state.success}</p>
        {rating > 0 ? (
          <div className="mt-3">
            <StarRow rating={rating} />
          </div>
        ) : null}
      </section>
    );
  }

  return (
    <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
      <h2 className="text-sm font-semibold">{t("leaveFeedback")}</h2>
      <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">{t("leaveFeedbackHint")}</p>

      <form action={formAction} className="mt-4 space-y-4">
        <input type="hidden" name="orderNumber" value={orderNumber} />
        <input type="hidden" name="rating" value={rating || ""} />

        <div className="space-y-2">
          <Label>{t("feedbackRating")}</Label>
          <StarRow rating={rating} interactive onSelect={setRating} />
          {state.fieldErrors?.rating ? (
            <p className="text-xs text-red-600">{state.fieldErrors.rating}</p>
          ) : null}
        </div>

        <div className="space-y-2">
          <Label htmlFor="feedback-comment">{t("feedbackCommentOptional")}</Label>
          <Textarea
            id="feedback-comment"
            name="comment"
            rows={3}
            maxLength={FEEDBACK_MAX_COMMENT_LENGTH}
            placeholder={t("feedbackCommentPlaceholder")}
            className="resize-none"
          />
          {state.fieldErrors?.comment ? (
            <p className="text-xs text-red-600">{state.fieldErrors.comment}</p>
          ) : null}
        </div>

        {state.error ? <p className="text-sm text-red-600">{state.error}</p> : null}

        <Button type="submit" disabled={pending || rating < 1} className="w-full">
          {pending ? t("submittingFeedback") : t("submitFeedback")}
        </Button>
      </form>
    </section>
  );
}
