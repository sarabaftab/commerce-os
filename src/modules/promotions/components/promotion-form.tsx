"use client";

import { useActionState, useState } from "react";

import type { Promotion } from "@prisma/client";

import type { PromotionActionState } from "@/modules/promotions/actions/promotion-actions";
import { BUY_ONE_GET_ONE } from "@/modules/promotions/buy-one-get-one";
import { toDatetimeLocalValue } from "@/modules/promotions/schemas/promotion";
import { fromMinor } from "@/shared/money/money";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { Textarea } from "@/ui/components/ui/textarea";

type PromotionProductOption = {
  id: string;
  name: string;
};

type PromotionFormPromotion = Promotion & {
  products?: { productId: string }[];
};

type PromotionFormProps = {
  currency: string;
  products: PromotionProductOption[];
  promotion?: PromotionFormPromotion;
  action: (prev: PromotionActionState, formData: FormData) => Promise<PromotionActionState>;
  submitLabel: string;
};

export function PromotionForm({
  currency,
  products,
  promotion,
  action,
  submitLabel,
}: PromotionFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [type, setType] = useState<"percentage" | "fixed" | typeof BUY_ONE_GET_ONE>(
    promotion?.type ?? "percentage",
  );
  const isBogo = type === BUY_ONE_GET_ONE;
  const selectedProductIds = new Set(
    (promotion?.products ?? []).map((row) => row.productId),
  );
  const valueDefault =
    promotion == null || isBogo
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

      <div className={isBogo ? "grid gap-2" : "grid grid-cols-2 gap-4"}>
        <div className="grid gap-2">
          <Label htmlFor="type" required>
            Discount type
          </Label>
          <select
            id="type"
            name="type"
            value={type}
            onChange={(event) =>
              setType(event.target.value as "percentage" | "fixed" | typeof BUY_ONE_GET_ONE)
            }
            className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
          >
            <option value="percentage">Percentage</option>
            <option value="fixed">Fixed amount ({currency})</option>
            <option value={BUY_ONE_GET_ONE}>1+1 (Buy 1 Get 1)</option>
          </select>
        </div>
        {!isBogo ? (
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
        ) : null}
      </div>

      {isBogo ? (
        <div className="grid gap-2">
          <Label>Eligible products</Label>
          {products.length === 0 ? (
            <p className="text-sm text-[color:var(--admin-ink-muted)]">
              No products available. Add products with stock before creating a 1+1 campaign.
            </p>
          ) : (
            <div className="max-h-64 space-y-2 overflow-y-auto rounded-lg border border-input p-3">
              {products.map((product) => (
                <label
                  key={product.id}
                  className="flex items-center gap-2 text-sm"
                >
                  <input
                    type="checkbox"
                    name="productIds"
                    value={product.id}
                    defaultChecked={selectedProductIds.has(product.id)}
                    className="size-4 rounded border"
                  />
                  <span>{product.name}</span>
                </label>
              ))}
            </div>
          )}
          {state.fieldErrors?.productIds ? (
            <p className="text-xs text-destructive">{state.fieldErrors.productIds[0]}</p>
          ) : null}
          <p className="text-xs text-[color:var(--admin-ink-muted)]">
            Buy 1, get 1 free of the same product. Stock quantity must be set on each product.
          </p>
        </div>
      ) : (
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
      )}

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
