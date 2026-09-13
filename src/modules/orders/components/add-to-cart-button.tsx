"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus } from "lucide-react";

import {
  ADD_TO_CART_SUCCESS_HOLD_MS,
  addToCartButtonLabel,
  storefrontCatalogPath,
  type AddToCartPhase,
} from "@/modules/orders/add-to-cart-ui";
import { addToCartAction } from "@/modules/orders/actions/cart-actions";
import { MAX_CART_QUANTITY } from "@/modules/orders/types";
import { notifyCartChanged } from "@/ui/storefront/cart-events";

type AddToCartButtonProps = {
  tenantSlug: string;
  productId: string;
  label?: string;
  showQuantity?: boolean;
  /**
   * After a successful add, briefly show confirmation then navigate to the
   * tenant catalog. Intended for product detail — not catalog cards.
   */
  navigateToCatalogOnSuccess?: boolean;
};

export function AddToCartButton({
  tenantSlug,
  productId,
  label = "Add to Cart",
  showQuantity = false,
  navigateToCatalogOnSuccess = false,
}: AddToCartButtonProps) {
  const router = useRouter();
  const [phase, setPhase] = useState<AddToCartPhase>("idle");
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [quantity, setQuantity] = useState(1);
  const inFlightRef = useRef(false);

  useEffect(() => {
    if (phase !== "added" || !navigateToCatalogOnSuccess) {
      return;
    }
    const timer = window.setTimeout(() => {
      router.push(storefrontCatalogPath(tenantSlug));
    }, ADD_TO_CART_SUCCESS_HOLD_MS);
    return () => window.clearTimeout(timer);
  }, [phase, navigateToCatalogOnSuccess, router, tenantSlug]);

  const busy = phase === "adding" || phase === "added";

  const add = () => {
    if (inFlightRef.current || busy) {
      return;
    }
    inFlightRef.current = true;
    setErrorMessage(null);
    setPhase("adding");

    void (async () => {
      try {
        await addToCartAction(tenantSlug, productId, showQuantity ? quantity : 1);
        setPhase("added");
        notifyCartChanged();
        if (!navigateToCatalogOnSuccess) {
          router.refresh();
        }
      } catch {
        setPhase("error");
        setErrorMessage("Could not add to cart");
      } finally {
        inFlightRef.current = false;
      }
    })();
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2">
        {showQuantity ? (
          <div className="inline-flex shrink-0 items-center rounded-full bg-[color:var(--shop-surface)] p-1 ring-1 ring-[color:var(--shop-line)]">
            <button
              type="button"
              disabled={busy || quantity <= 1}
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
              disabled={busy || quantity >= MAX_CART_QUANTITY}
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
          disabled={busy}
          onClick={add}
          aria-live="polite"
          aria-busy={phase === "adding"}
          className="flex h-12 min-h-12 flex-1 items-center justify-center rounded-full bg-[color:var(--shop-primary)] px-4 text-sm font-semibold text-[color:var(--shop-on-primary)] shadow-[var(--shop-shadow-sm)] transition hover:bg-[color:var(--shop-accent-soft)] active:scale-[0.98] disabled:opacity-70"
        >
          {addToCartButtonLabel(phase, label)}
        </button>
      </div>
      {errorMessage ? (
        <p role="alert" className="text-center text-xs text-destructive">
          {errorMessage}
        </p>
      ) : null}
    </div>
  );
}
