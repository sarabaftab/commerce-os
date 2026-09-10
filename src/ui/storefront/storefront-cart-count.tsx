"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";

import { CART_CHANGED_EVENT } from "@/ui/storefront/cart-events";

type StorefrontCartCountContextValue = {
  itemCount: number;
};

const StorefrontCartCountContext = createContext<StorefrontCartCountContextValue | null>(
  null,
);

/**
 * Shared client cart-count for header badge + checkout CTA.
 * Uses the existing count API and CART_CHANGED_EVENT — not a second cart system.
 */
export function StorefrontCartCountProvider({
  tenantSlug,
  children,
}: {
  tenantSlug: string;
  children: ReactNode;
}) {
  const [itemCount, setItemCount] = useState(0);

  const loadCount = useCallback(async (signal?: { cancelled: boolean }) => {
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/cart?view=count`, {
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok || signal?.cancelled) {
        return;
      }
      const payload = (await res.json()) as { data?: { itemCount?: number } };
      if (!signal?.cancelled) {
        setItemCount(payload.data?.itemCount ?? 0);
      }
    } catch {
      // Keep last known count — never block navigation.
    }
  }, [tenantSlug]);

  useEffect(() => {
    const signal = { cancelled: false };
    void loadCount(signal);
    const onCartChanged = () => {
      void loadCount();
    };
    window.addEventListener(CART_CHANGED_EVENT, onCartChanged);
    return () => {
      signal.cancelled = true;
      window.removeEventListener(CART_CHANGED_EVENT, onCartChanged);
    };
  }, [loadCount]);

  const value = useMemo(() => ({ itemCount }), [itemCount]);

  return (
    <StorefrontCartCountContext.Provider value={value}>
      {children}
    </StorefrontCartCountContext.Provider>
  );
}

export function useStorefrontCartItemCount(): number {
  const ctx = useContext(StorefrontCartCountContext);
  if (!ctx) {
    throw new Error("useStorefrontCartItemCount must be used within StorefrontCartCountProvider");
  }
  return ctx.itemCount;
}
