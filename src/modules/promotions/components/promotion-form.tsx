"use client";

import { useActionState } from "react";

import type { Promotion } from "@prisma/client";

import type { PromotionActionState } from "@/modules/promotions/actions/promotion-actions";
import { toDatetimeLocalValue } from "@/modules/promotions/schemas/promotion";
import { fromMinor } from "@/shared/money/money";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { Textarea } from "@/ui/components/ui/textarea";

type PromotionFormProps = {
  currency: string;
  promotion?: Promotion;
  action: (prev: PromotionActionState, formData: FormData) => Promise<PromotionActionState>;
  submitLabel: string;
};

export function PromotionForm({
  currency,
  promotion,
  action,
  submitLabel,
}: PromotionFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const valueDefault =
    promotion == null
      ? ""
      : promotion.type === "percentage"
        ? String(promotion.value)
        : String(fromMinor(promotion.value, currency));
  const minDefault =
    promotion?.minimumSubtotalMinor == null
      ? ""
      : String(fromMinor(promotion.minimumSubtotalMinor, currency));

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      {state.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <input type="hidden" name="currency" value={currency} />

      <div className="grid gap-2">
        <Label htmlFor="name" required>
          Name
        </Label>
        <Input id="name" name="name" required maxLength={120} defaultValue={promotion?.name ?? ""} />
        {state.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="bannerText">Customer banner text (optional)</Label>
        <Textarea
          id="bannerText"
          name="bannerText"
          rows={2}
          maxLength={280}
          defaultValue={promotion?.bannerText ?? ""}
          placeholder="Shown on the storefront while this campaign is active"
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="type" required>
            Discount type
          </Label>
          <select
            id="type"
            name="type"
            defaultValue={promotion?.type ?? "percentage"}
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount ({currency})</option>
          </select>
        </div>
        <div className="grid gap-2">
          <Label htmlFor="valueMajor" required>
            Value
          </Label>
          <Input
            id="valueMajor"
            name="valueMajor"
            type="number"
            step="any"
            min="0"
            required
            defaultValue={valueDefault}
          />
          {state.fieldErrors?.valueMajor ? (
            <p className="text-xs text-destructive">{state.fieldErrors.valueMajor[0]}</p>
          ) : null}
          <p className="text-xs text-[color:var(--admin-ink-muted)]">
            Percentage: 1–100. Fixed: amount in {currency}.
          </p>
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="minimumSubtotalMajor">Minimum order subtotal (optional)</Label>
        <Input
          id="minimumSubtotalMajor"
          name="minimumSubtotalMajor"
          type="number"
          step="any"
          min="0"
          defaultValue={minDefault}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="startsAt">Starts at (optional)</Label>
          <Input
            id="startsAt"
            name="startsAt"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(promotion?.startsAt)}
          />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="endsAt">Ends at (optional)</Label>
          <Input
            id="endsAt"
            name="endsAt"
            type="datetime-local"
            defaultValue={toDatetimeLocalValue(promotion?.endsAt)}
          />
          {state.fieldErrors?.endsAt ? (
            <p className="text-xs text-destructive">{state.fieldErrors.endsAt[0]}</p>
          ) : null}
        </div>
      </div>

      <div className="flex items-center gap-2">
        <input
          id="isActive"
          name="isActive"
          type="checkbox"
          value="true"
          defaultChecked={promotion?.isActive ?? true}
          className="size-4 rounded border"
        />
        <Label htmlFor="isActive">Active</Label>
      </div>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
