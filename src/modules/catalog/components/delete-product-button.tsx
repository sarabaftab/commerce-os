"use client";

import { useTransition } from "react";

import { deleteProductAction } from "@/modules/catalog/actions/product-actions";
import { Button } from "@/ui/components/ui/button";

type DeleteProductButtonProps = {
  productId: string;
};

export function DeleteProductButton({ productId }: DeleteProductButtonProps) {
  const [pending, startTransition] = useTransition();

  return (
    <Button
      type="button"
      variant="destructive"
      size="sm"
      disabled={pending}
      onClick={() => {
        if (!window.confirm("Delete this product?")) {
          return;
        }
        startTransition(async () => {
          await deleteProductAction(productId);
        });
      }}
    >
      {pending ? "Deleting…" : "Delete"}
    </Button>
  );
}
