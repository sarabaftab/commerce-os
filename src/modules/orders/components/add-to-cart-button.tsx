"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";

import { addToCartAction } from "@/modules/orders/actions/cart-actions";

type AddToCartButtonProps = {
  tenantSlug: string;
  productId: string;
  label?: string;
};

export function AddToCartButton({
  tenantSlug,
  productId,
  label = "Add to cart",
}: AddToCartButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <div className="space-y-2">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          setMessage(null);
          startTransition(async () => {
            try {
              await addToCartAction(tenantSlug, productId, 1);
              setMessage("Added to cart");
              router.refresh();
            } catch {
              setMessage("Could not add to cart");
            }
          });
        }}
        className="flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--shop-accent)] text-sm font-semibold text-white transition active:scale-[0.98] disabled:opacity-70"
      >
        {pending ? "Adding…" : label}
      </button>
      {message ? (
        <p className="text-center text-xs text-[color:var(--shop-ink-muted)]">{message}</p>
      ) : null}
    </div>
  );
}
