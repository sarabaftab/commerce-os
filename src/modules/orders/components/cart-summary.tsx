"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";

import type { CartSummary } from "@/modules/orders";
import { clearCartAction } from "@/modules/orders/actions/cart-actions";
import { formatMoney } from "@/shared/money/money";

type CartSummaryPanelProps = {
  tenantSlug: string;
  summary: CartSummary;
};

export function CartSummaryPanel({ tenantSlug, summary }: CartSummaryPanelProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const hasAvailableItems = summary.items.some((item) => item.isAvailable);

  return (
    <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
      <div className="flex items-center justify-between text-sm">
        <span className="text-[color:var(--shop-ink-muted)]">Subtotal</span>
        <span className="font-semibold">
          {formatMoney(summary.subtotalMinor, summary.currency)}
        </span>
      </div>
      <p className="text-xs text-[color:var(--shop-ink-muted)]">
        Delivery fee calculated at checkout.
      </p>

      {hasAvailableItems ? (
        <Link
          href={`/${tenantSlug}/checkout`}
          className="flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--shop-primary)] text-sm font-semibold text-[color:var(--shop-on-primary)]"
        >
          Proceed to checkout
        </Link>
      ) : (
        <button
          type="button"
          disabled
          className="flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--shop-primary)] text-sm font-semibold text-[color:var(--shop-on-primary)] opacity-70"
        >
          Proceed to checkout
        </button>
      )}

      {summary.items.length > 0 ? (
        <button
          type="button"
          disabled={pending}
          onClick={() => {
            startTransition(async () => {
              await clearCartAction(tenantSlug);
              router.refresh();
            });
          }}
          className="w-full text-sm font-medium text-[color:var(--shop-ink-muted)] underline-offset-4 hover:underline disabled:opacity-50"
        >
          {pending ? "Clearing…" : "Clear cart"}
        </button>
      ) : null}

      {!hasAvailableItems && summary.items.length > 0 ? (
        <p className="text-xs text-destructive">
          Remove unavailable items before checkout.
        </p>
      ) : null}
    </div>
  );
}
