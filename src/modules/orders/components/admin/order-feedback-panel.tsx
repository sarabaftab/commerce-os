import { Star } from "lucide-react";

import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";

type OrderFeedbackPanelProps = {
  feedback: {
    rating: number;
    comment: string | null;
    createdAt: Date;
  } | null;
};

export function OrderFeedbackPanel({ feedback }: OrderFeedbackPanelProps) {
  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Customer feedback</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2 text-sm">
        {!feedback ? (
          <p className="text-muted-foreground">No feedback yet.</p>
        ) : (
          <>
            <div className="flex items-center gap-1" aria-label={`${feedback.rating} out of 5`}>
              {[1, 2, 3, 4, 5].map((value) => (
                <Star
                  key={value}
                  className={
                    value <= feedback.rating
                      ? "size-4 fill-amber-400 text-amber-400"
                      : "size-4 text-muted-foreground/40"
                  }
                />
              ))}
              <span className="ml-1 tabular-nums text-muted-foreground">{feedback.rating}/5</span>
            </div>
            {feedback.comment ? (
              <p className="text-foreground">{feedback.comment}</p>
            ) : (
              <p className="text-muted-foreground">No comment.</p>
            )}
            <p className="text-xs text-muted-foreground">
              Submitted {feedback.createdAt.toLocaleString()}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
}
