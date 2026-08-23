"use client";

import Link from "next/link";
import { useTransition } from "react";
import { useRouter } from "next/navigation";
import { Minus, Plus, Trash2 } from "lucide-react";

import type { CartLineView } from "@/modules/orders";
import { formatPackSizeLine, formatUnitPriceLabel } from "@/modules/catalog/selling-unit";
import {
  removeCartItemAction,
  updateCartItemAction,
} from "@/modules/orders/actions/cart-actions";
import { formatMoney } from "@/shared/money/money";
import { notifyCartChanged } from "@/ui/storefront/cart-events";
import { ProductImage } from "@/ui/storefront/product-image";

type CartLineItemProps = {
  tenantSlug: string;
  basePath: string;
  line: CartLineView;
};

export function CartLineItem({ tenantSlug, basePath, line }: CartLineItemProps) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();

  const updateQuantity = (quantity: number) => {
    startTransition(async () => {
      await updateCartItemAction(tenantSlug, line.id, quantity);
      notifyCartChanged();
      router.refresh();
    });
  };

  const remove = () => {
    startTransition(async () => {
      await removeCartItemAction(tenantSlug, line.id);
      notifyCartChanged();
      router.refresh();
    });
  };

  return (
    <div
      className={`flex gap-3 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-3 ring-1 ring-[color:var(--shop-line)] ${!line.isAvailable ? "opacity-60" : ""}`}
    >
      <Link
        href={`${basePath}/products/${line.slug}`}
        className="relative size-20 shrink-0 overflow-hidden rounded-xl bg-[color:var(--shop-surface)]"
      >
        {line.imageUrl ? (
          <div className="absolute inset-1.5">
            <ProductImage
              src={line.imageUrl}
              alt={line.name}
              sizes="80px"
              className="h-full w-full"
            />
          </div>
        ) : (
          <div className="flex h-full w-full items-end bg-[radial-gradient(circle_at_30%_20%,#fae588,transparent_55%),linear-gradient(160deg,#fffdf4,#fff1b9)] p-2">
            <span className="text-[10px] text-[color:var(--shop-ink-muted)]">Product</span>
          </div>
        )}
      </Link>

      <div className="flex min-w-0 flex-1 flex-col gap-2">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <Link
              href={`${basePath}/products/${line.slug}`}
              className="line-clamp-2 font-medium leading-snug text-[color:var(--shop-ink)]"
            >
              {line.name}
            </Link>
            <p className="mt-1 text-sm font-semibold">
              {formatUnitPriceLabel(
                formatMoney(line.unitPriceMinor, line.currency),
                line.sellingUnit,
              )}
            </p>
            {formatPackSizeLine(line.volume, line.sellingUnit) ? (
              <p className="text-xs text-[color:var(--shop-ink-muted)]">
                {formatPackSizeLine(line.volume, line.sellingUnit)}
              </p>
            ) : null}
            {!line.isAvailable ? (
              <p className="mt-1 text-xs text-destructive">No longer available</p>
            ) : null}
          </div>
          <button
            type="button"
            disabled={pending}
            onClick={remove}
            className="rounded-full p-2 text-[color:var(--shop-ink-muted)] transition hover:bg-[color:var(--shop-surface)]"
            aria-label="Remove item"
          >
            <Trash2 className="size-4" />
          </button>
        </div>

        {line.isAvailable ? (
          <div className="flex items-center justify-between gap-2">
            <div className="inline-flex items-center rounded-full bg-[color:var(--shop-surface)] p-1">
              <button
                type="button"
                disabled={pending || line.quantity <= 1}
                onClick={() => updateQuantity(line.quantity - 1)}
                className="flex size-8 items-center justify-center rounded-full disabled:opacity-40"
                aria-label="Decrease quantity"
              >
                <Minus className="size-4" />
              </button>
              <span className="min-w-8 text-center text-sm font-medium">{line.quantity}</span>
              <button
                type="button"
                disabled={pending}
                onClick={() => updateQuantity(line.quantity + 1)}
                className="flex size-8 items-center justify-center rounded-full disabled:opacity-40"
                aria-label="Increase quantity"
              >
                <Plus className="size-4" />
              </button>
            </div>
            <p className="text-sm font-semibold">
              {formatMoney(line.lineTotalMinor, line.currency)}
            </p>
          </div>
        ) : null}
      </div>
    </div>
  );
}
