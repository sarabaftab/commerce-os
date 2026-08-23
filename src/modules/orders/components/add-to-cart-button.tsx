"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";

import { addToCartAction } from "@/modules/orders/actions/cart-actions";
import { MAX_CART_QUANTITY } from "@/modules/orders/types";
import { notifyCartChanged } from "@/ui/storefront/cart-events";

type AddToCartButtonProps = {
  tenantSlug: string;
  productId: string;
  label?: string;
  showQuantity?: boolean;
};

export function AddToCartButton({
  tenantSlug,
  productId,
  label = "Add to cart",
  showQuantity = false,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);

  const add = () => {
    setMessage(null);
    startTransition(async () => {
      try {
        await addToCartAction(tenantSlug, productId, showQuantity ? quantity : 1);
        setMessage("Added to cart");
        notifyCartChanged();
        router.refresh();
      } catch {
        setMessage("Could not add to cart");
      }
    });
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {showQuantity ? (
          <div className="inline-flex shrink-0 items-center rounded-full bg-[color:var(--shop-surface)] p-1 ring-1 ring-[color:var(--shop-line)]">
            <button
              type="button"
              disabled={pending || quantity <= 1}
              onClick={() => setQuantity((value) => Math.max(1, value - 1))}
              className="flex size-10 items-center justify-center rounded-full disabled:opacity-40"
              aria-label="Decrease quantity"
            >
              <Minus className="size-4" />
            </button>
            <span className="min-w-8 text-center text-sm font-medium" aria-live="polite">
              {quantity}
            </span>
            <button
              type="button"
              disabled={pending || quantity >= MAX_CART_QUANTITY}
              onClick={() => setQuantity((value) => Math.min(MAX_CART_QUANTITY, value + 1))}
              className="flex size-10 items-center justify-center rounded-full disabled:opacity-40"
              aria-label="Increase quantity"
            >
              <Plus className="size-4" />
            </button>
          </div>
        ) : null}
        <button
          type="button"
          disabled={pending}
          onClick={add}
          className="flex h-12 min-h-12 flex-1 items-center justify-center rounded-full bg-[color:var(--shop-primary)] px-4 text-sm font-semibold text-[color:var(--shop-on-primary)] shadow-[var(--shop-shadow-sm)] transition hover:bg-[color:var(--shop-accent-soft)] active:scale-[0.98] disabled:opacity-70"
        >
          {pending ? "Adding…" : label}
        </button>
      </div>
      {message ? (
        <p className="text-center text-xs text-[color:var(--shop-ink-muted)]">{message}</p>
      ) : null}
    </div>
  );
}
