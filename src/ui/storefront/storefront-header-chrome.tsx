"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

import { CartIconLink } from "@/ui/storefront/cart-icon-link";

type Props = {
  tenantSlug: string;
};

/**
 * Customer-specific header chrome — fetched client-side so the storefront
 * layout/pages stay free of cookies() and remain ISR-eligible.
 */
export function StorefrontHeaderChrome({ tenantSlug }: Props) {
  const pathname = usePathname();
  const [itemCount, setItemCount] = useState(0);
  const basePath = `/${tenantSlug}`;

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
    return () => {
      cancelled = true;
    };
  }, [tenantSlug, pathname]);

  return (
    <>
      <Link
        href={`${basePath}/account`}
        className="rounded-full px-3 py-2 text-[color:var(--shop-ink)] transition hover:bg-[color:var(--shop-surface)]/70"
      >
        Account
      </Link>
      <CartIconLink basePath={basePath} itemCount={itemCount} />
    </>
  );
}
