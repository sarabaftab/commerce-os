"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { useTelegram } from "@/channels/telegram/client/telegram-provider";
import {
  ACCOUNT_SESSION_SYNC_KEY,
  accountSyncWasRecent,
  resolveAccountAuthGate,
} from "@/modules/customers/account-auth-gate";
import { shop } from "@/ui/storefront/shop-classes";

type AccountAuthGateProps = {
  tenantSlug: string;
};

export function AccountAuthGate({ tenantSlug }: AccountAuthGateProps) {
  const router = useRouter();
  const { authStatus, retryAuth } = useTelegram();
  const [storageReady, setStorageReady] = useState(false);
  const [hardReloadAttempted, setHardReloadAttempted] = useState(false);
  const view = resolveAccountAuthGate({
    authStatus,
    storageReady,
    hardReloadAttempted,
  });

  useEffect(() => {
    setHardReloadAttempted(accountSyncWasRecent());
    setStorageReady(true);
  }, []);

  useEffect(() => {
    if (authStatus !== "authenticated" || !storageReady || hardReloadAttempted) {
      return;
    }
    sessionStorage.setItem(ACCOUNT_SESSION_SYNC_KEY, String(Date.now()));
    window.location.reload();
  }, [authStatus, storageReady, hardReloadAttempted]);

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
          We couldn’t save your Telegram session in this Mini App. Try again — if it still fails,
          close the Mini App and reopen it from the bot.
        </p>
        <button
          type="button"
          className={shop.btnPrimary}
          onClick={() => {
            sessionStorage.removeItem(ACCOUNT_SESSION_SYNC_KEY);
            setHardReloadAttempted(false);
            retryAuth();
          }}
        >
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
