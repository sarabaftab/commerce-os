"use client";

import { useTransition } from "react";

import { deleteFaqAction } from "@/modules/faq/actions/faq-actions";
import { Button } from "@/ui/components/ui/button";

type DeleteFaqButtonProps = {
  faqId: string;
};

export function DeleteFaqButton({ faqId }: DeleteFaqButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this FAQ?")) {
          return;
        }
        startTransition(async () => {
          await deleteFaqAction(faqId);
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
