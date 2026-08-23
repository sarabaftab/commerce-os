"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

import { useTelegram } from "@/channels/telegram/client/telegram-provider";
import { CART_CHANGED_EVENT } from "@/ui/storefront/cart-events";
import { CartIconLink } from "@/ui/storefront/cart-icon-link";

type Props = {
  tenantSlug: string;
};

/**
 * Customer-specific header chrome — fetched client-side so the storefront
 * layout/pages stay free of cookies() and remain ISR-eligible.
 *
 * Do not refetch on every pathname: Next already prefetches /cart and /account
 * unless disabled; pathname refetch stacked extra pooler sessions.
 */
export function StorefrontHeaderChrome({ tenantSlug }: Props) {
  const [itemCount, setItemCount] = useState(0);
  const basePath = `/${tenantSlug}`;
  const { isTelegram, authStatus } = useTelegram();
  const telegramAuthPending =
    isTelegram && (authStatus === "idle" || authStatus === "loading");

  useEffect(() => {
    let cancelled = false;

    async function loadCount() {
      try {
        const res = await fetch(`/api/v1/${tenantSlug}/cart?view=count`, {
          credentials: "include",
          cache: "no-store",
        });
        if (!res.ok || cancelled) return;
        const payload = (await res.json()) as { data?: { itemCount?: number } };
        if (!cancelled) {
          setItemCount(payload.data?.itemCount ?? 0);
        }
      } catch {
        // Badge stays at last known / zero — never block navigation.
      }
    }

    void loadCount();
    const onCartChanged = () => {
      void loadCount();
    };
    window.addEventListener(CART_CHANGED_EVENT, onCartChanged);
    return () => {
      cancelled = true;
      window.removeEventListener(CART_CHANGED_EVENT, onCartChanged);
    };
  }, [tenantSlug]);

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
