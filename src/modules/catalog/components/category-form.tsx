"use client";

import { useActionState, useEffect, useState } from "react";

import type { Category } from "@prisma/client";

import type { CategoryActionState } from "@/modules/catalog/actions/category-actions";
import { slugifyCategoryName } from "@/modules/catalog/schemas/category";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";

type CategoryFormProps = {
  category?: Pick<Category, "name" | "slug" | "sortOrder" | "isActive">;
  action: (prev: CategoryActionState, formData: FormData) => Promise<CategoryActionState>;
  submitLabel: string;
};

export function CategoryForm({ category, action, submitLabel }: CategoryFormProps) {
  const [state, formAction, pending] = useActionState(action, {});
  const [name, setName] = useState(category?.name ?? "");
  const [slug, setSlug] = useState(category?.slug ?? "");
  const [slugTouched, setSlugTouched] = useState(Boolean(category?.slug));

  useEffect(() => {
    if (!slugTouched) {
      setSlug(slugifyCategoryName(name));
    }
  }, [name, slugTouched]);

  return (
    <form action={formAction} className="mx-auto max-w-2xl space-y-6">
      {state.error ? (
        <div className="rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </div>
      ) : null}

      <div className="grid gap-2">
        <Label htmlFor="name" required>
          Name
        </Label>
        <Input
          id="name"
          name="name"
          required
          maxLength={80}
          value={name}
          onChange={(event) => setName(event.target.value)}
        />
        {state.fieldErrors?.name ? (
          <p className="text-xs text-destructive">{state.fieldErrors.name[0]}</p>
        ) : null}
      </div>

      <div className="grid gap-2">
        <Label htmlFor="slug" required>
          Slug
        </Label>
        <Input
          id="slug"
          name="slug"
          required
          maxLength={100}
          value={slug}
          onChange={(event) => {
            setSlugTouched(true);
            setSlug(event.target.value);
          }}
        />
        {state.fieldErrors?.slug ? (
          <p className="text-xs text-destructive">{state.fieldErrors.slug[0]}</p>
        ) : null}
        <p className="text-xs text-[color:var(--admin-ink-muted)]">
          Lowercase kebab-case. Auto-fills from name until you edit it.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div className="grid gap-2">
          <Label htmlFor="sortOrder">Sort order</Label>
          <Input
            id="sortOrder"
            name="sortOrder"
            type="number"
            defaultValue={String(category?.sortOrder ?? 0)}
          />
          {state.fieldErrors?.sortOrder ? (
            <p className="text-xs text-destructive">{state.fieldErrors.sortOrder[0]}</p>
          ) : null}
          <p className="text-xs text-[color:var(--admin-ink-muted)]">
            Lower numbers appear first in the shop.
          </p>
        </div>
        <div className="flex items-end gap-2 pb-2">
          <input
            id="isActive"
            name="isActive"
            type="checkbox"
            value="true"
            defaultChecked={category?.isActive ?? true}
            className="size-4 rounded border"
          />
          <Label htmlFor="isActive">Active (visible to customers)</Label>
        </div>
      </div>

      <p className="text-xs text-[color:var(--admin-ink-muted)]">
        Inactive categories are hidden from the storefront. Products in that category stay
        available under All products unless you unpublish them separately.
      </p>

      <div className="flex justify-end gap-2">
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : submitLabel}
        </Button>
      </div>
    </form>
  );
}
