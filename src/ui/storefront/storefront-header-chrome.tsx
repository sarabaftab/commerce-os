"use client";

import Link from "next/link";

import { useTelegram } from "@/channels/telegram/client/telegram-provider";
import { CartIconLink } from "@/ui/storefront/cart-icon-link";
import { useStorefrontCartItemCount } from "@/ui/storefront/storefront-cart-count";

type Props = {
  tenantSlug: string;
};

/**
 * Customer-specific header chrome — cart count is shared with the sticky checkout CTA
 * via StorefrontCartCountProvider (same count API + CART_CHANGED_EVENT).
 */
export function StorefrontHeaderChrome({ tenantSlug }: Props) {
  const itemCount = useStorefrontCartItemCount();
  const basePath = `/${tenantSlug}`;
  const { isTelegram, authStatus } = useTelegram();
  const telegramAuthPending =
    isTelegram && (authStatus === "idle" || authStatus === "loading");

  return (
    <>
      {telegramAuthPending ? (
        <span
          className="rounded-full px-3 py-2 text-[color:var(--shop-ink-muted)]"
          aria-busy="true"
        >
          Account
        </span>
      ) : (
        <Link
          href={`${basePath}/account`}
          prefetch={false}
          className="rounded-full px-3 py-2 text-[color:var(--shop-ink)] transition hover:bg-[color:var(--shop-surface)]/70"
        >
          Account
        </Link>
      )}
      <CartIconLink basePath={basePath} itemCount={itemCount} />
    </>
  );
}
