"use client";

import { useActionState } from "react";

import type { Faq } from "@prisma/client";

import type { FaqActionState } from "@/modules/faq/actions/faq-actions";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { Textarea } from "@/ui/components/ui/textarea";

type FaqFormProps = {
  faq?: Pick<Faq, "question" | "answer" | "sortOrder" | "isActive">;
  action: (prev: FaqActionState, formData: FormData) => Promise<FaqActionState>;
  submitLabel: string;
};

export function FaqForm({ faq, action, submitLabel }: FaqFormProps) {
  const [state, formAction, pending] = useActionState(action, {});

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      {state.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="question" required>
          Question
        </Label>
        <Input
          id="question"
          name="question"
          required
          maxLength={240}
          defaultValue={faq?.question ?? ""}
        />
        {state.fieldErrors?.question ? (
          <p className="text-xs text-destructive">{state.fieldErrors.question[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="answer" required>
          Answer
        </Label>
        <Textarea
          id="answer"
          name="answer"
          required
          maxLength={4000}
          rows={8}
          defaultValue={faq?.answer ?? ""}
        />
        {state.fieldErrors?.answer ? (
          <p className="text-xs text-destructive">{state.fieldErrors.answer[0]}</p>
        ) : null}
        <p className="text-xs text-[color:var(--admin-ink-muted)]">
          Plain text only. Line breaks are kept on the storefront.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={String(faq?.sortOrder ?? 0)}
          />
          {state.fieldErrors?.sortOrder ? (
            <p className="text-xs text-destructive">{state.fieldErrors.sortOrder[0]}</p>
          ) : null}
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            value="true"
            defaultChecked={faq?.isActive ?? true}
            className="size-4 rounded border"
          />
          <Label htmlFor="isActive">Active (visible to customers)</Label>
        </div>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
