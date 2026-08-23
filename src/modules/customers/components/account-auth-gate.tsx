"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useTelegram } from "@/channels/telegram/client/telegram-provider";
import { resolveAccountAuthGate } from "@/modules/customers/account-auth-gate";
import { shop } from "@/ui/storefront/shop-classes";

type AccountAuthGateProps = {
  tenantSlug: string;
};

export function AccountAuthGate({ tenantSlug }: AccountAuthGateProps) {
  const router = useRouter();
  const { authStatus, retryAuth } = useTelegram();
  const [refreshAttempted, setRefreshAttempted] = useState(false);
  const view = resolveAccountAuthGate({
    authStatus,
    refreshAttempted,
  });

  useEffect(() => {
    if (authStatus === "idle" || authStatus === "loading") {
      setRefreshAttempted(false);
    }
  }, [authStatus]);

  useEffect(() => {
    if (authStatus !== "authenticated" || refreshAttempted) {
      return;
    }
    setRefreshAttempted(true);
    router.refresh();
  }, [authStatus, refreshAttempted, router]);

  useEffect(() => {
    if (view !== "redirect-home") {
      return;
    }
    router.replace(`/${tenantSlug}`);
  }, [router, tenantSlug, view]);

  if (view === "redirect-home") {
    return (
      <p className="pt-6 text-sm text-[color:var(--shop-ink-muted)]">Taking you back to the shop…</p>
    );
  }

  if (view === "retry") {
    return (
      <div className="space-y-4 pt-6">
        <h1 className="font-[family-name:var(--font-shop-display)] text-2xl tracking-tight">
          Couldn’t open Account
        </h1>
        <p className="text-sm text-[color:var(--shop-ink-muted)]">
          We couldn’t connect your Telegram session. You can try again without leaving the Mini App.
        </p>
        <button type="button" className={shop.btnPrimary} onClick={() => retryAuth()}>
          Try again
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-6">
      <h1 className="font-[family-name:var(--font-shop-display)] text-2xl tracking-tight">
        Connecting your Telegram account…
      </h1>
      <p className="text-sm text-[color:var(--shop-ink-muted)]">
        This only takes a moment. Account stays private until your session is ready.
      </p>
    </div>
  );
}
