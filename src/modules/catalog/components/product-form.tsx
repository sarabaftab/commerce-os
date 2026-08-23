"use client";

import { useActionState } from "react";

import type { Category } from "@prisma/client";

import type { ProductWithRelations } from "@/modules/catalog";
import type { ActionState } from "@/modules/catalog/actions/product-actions";
import { fromMinor } from "@/shared/money/money";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { Textarea } from "@/ui/components/ui/textarea";

type ProductFormProps = {
  categories: Category[];
  currency: string;
  product?: ProductWithRelations;
  action: (prev: ActionState, formData: FormData) => Promise<ActionState>;
  submitLabel: string;
};

export function ProductForm({
  categories,
  currency,
  product,
  action,
  submitLabel,
}: ProductFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const primaryMedia = product?.media[0]?.url ?? "";

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      {state.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="name">Name</Label>
        <Input id="name" name="name" required defaultValue={product?.name ?? ""} />
        {state.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug">Slug</Label>
        <Input id="slug" name="slug" required defaultValue={product?.slug ?? ""} />
        {state.fieldErrors?.slug ? (
          <p className="text-xs text-destructive">{state.fieldErrors.slug[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          name="description"
          rows={4}
          defaultValue={product?.description ?? ""}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="brand">Brand (optional)</Label>
          <Input id="brand" name="brand" defaultValue={product?.brand ?? ""} />
        </div>
        <div className="grid gap-2">
          <Label htmlFor="volume">Pack size / volume (optional)</Label>
          <Input
            id="volume"
            name="volume"
            defaultValue={product?.volume ?? ""}
            placeholder="e.g. 12 × 950ml"
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="sellingUnit">Selling unit</Label>
        <select
          id="sellingUnit"
          name="sellingUnit"
          defaultValue={product?.sellingUnit ?? "item"}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="item">Item</option>
          <option value="pack">Pack</option>
          <option value="case">Case</option>
        </select>
        <p className="text-xs text-muted-foreground">
          Shown next to price (for example $30.00 / case). Does not change totals.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="priceMajor">Price ({currency})</Label>
          <Input
            id="priceMajor"
            name="priceMajor"
            type="number"
            step="0.01"
            min="0"
            required
            defaultValue={
              product ? String(fromMinor(product.priceMinor, product.currency)) : ""
            }
          />
          {state.fieldErrors?.priceMajor ? (
            <p className="text-xs text-destructive">{state.fieldErrors.priceMajor[0]}</p>
          ) : null}
        </div>
        <div className="grid gap-2">
          <Label htmlFor="currency">Currency</Label>
          <Input
            id="currency"
            name="currency"
            maxLength={3}
            required
            defaultValue={product?.currency ?? currency}
          />
        </div>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="categoryId">Category</Label>
        <select
          id="categoryId"
          name="categoryId"
          defaultValue={product?.categoryId ?? ""}
          className="h-8 w-full rounded-lg border border-input bg-transparent px-2.5 text-sm"
        >
          <option value="">No category</option>
          {categories.map((category) => (
            <option key={category.id} value={category.id}>
              {category.name}
            </option>
          ))}
        </select>
      </div>

      <div className="grid gap-2">
        <Label htmlFor="stockNote">Stock note (optional)</Label>
        <Input
          id="stockNote"
          name="stockNote"
          defaultValue={product?.stockNote ?? ""}
          placeholder="e.g. Daily delivery"
        />
      </div>

      <div className="grid gap-2">
        <Label htmlFor="mediaUrl">Media URL (optional)</Label>
        <Input
          id="mediaUrl"
          name="mediaUrl"
          type="url"
          defaultValue={primaryMedia}
          placeholder="https://..."
        />
        {state.fieldErrors?.mediaUrl ? (
          <p className="text-xs text-destructive">{state.fieldErrors.mediaUrl[0]}</p>
        ) : null}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={String(product?.sortOrder ?? 0)}
          />
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input
            id="isAvailable"
            name="isAvailable"
            type="checkbox"
            value="true"
            defaultChecked={product?.isAvailable ?? true}
            className="size-4 rounded border"
          />
          <Label htmlFor="isAvailable">Available for sale</Label>
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
