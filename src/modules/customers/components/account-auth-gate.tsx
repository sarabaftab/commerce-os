"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY } from "@/channels/telegram/account-access-constants";
import { submitTelegramSessionForm } from "@/channels/telegram/client/submit-session-form";
import { waitForTelegramInitData } from "@/channels/telegram/client/wait-for-init-data";
import { useTelegram } from "@/channels/telegram/client/telegram-provider";
import {
  TELEGRAM_ACCOUNT_NAV_KEY,
  resolveAccountAuthGate,
} from "@/modules/customers/account-auth-gate";
import { useLocale } from "@/shared/i18n";
import { shop } from "@/ui/storefront/shop-classes";

type AccountAuthGateProps = {
  tenantSlug: string;
};

export function AccountAuthGate({ tenantSlug }: AccountAuthGateProps) {
  const { t } = useLocale();
  const router = useRouter();
  const { authStatus, isTelegram, retryAuth } = useTelegram();
  const [navigationAttempted, setNavigationAttempted] = useState(false);
  const startedRef = useRef(false);
  const view = resolveAccountAuthGate({
    authStatus,
    navigationAttempted,
  });

  useEffect(() => {
    if (new URLSearchParams(window.location.search).has("tg_s")) {
      setNavigationAttempted(false);
      return;
    }
    setNavigationAttempted(sessionStorage.getItem(TELEGRAM_ACCOUNT_NAV_KEY) === "1");
  }, []);

  useEffect(() => {
    if (!isTelegram || authStatus === "skipped" || navigationAttempted || startedRef.current) {
      return;
    }
    const webApp = window.Telegram?.WebApp;
    if (!webApp) {
      return;
    }
    startedRef.current = true;
    void (async () => {
      const initData = await waitForTelegramInitData(() => webApp.initData);
      if (!initData) {
        startedRef.current = false;
        setNavigationAttempted(true);
        return;
      }
      sessionStorage.setItem(TELEGRAM_ACCOUNT_NAV_KEY, "1");
      submitTelegramSessionForm({
        tenantSlug,
        initData,
        nextPath: window.location.pathname,
      });
    })();
  }, [authStatus, isTelegram, navigationAttempted, tenantSlug]);

  useEffect(() => {
    if (view !== "redirect-home") {
      return;
    }
    router.replace(`/${tenantSlug}`);
  }, [router, tenantSlug, view]);

  if (view === "redirect-home") {
    return (
      <p className="pt-6 text-sm text-[color:var(--shop-ink-muted)]">{t("takingYouBack")}</p>
    );
  }

  if (view === "retry") {
    return (
      <div className="space-y-4 pt-6">
        <h1 className="font-[family-name:var(--font-shop-display)] text-2xl tracking-tight">
          {t("couldNotOpenAccount")}
        </h1>
        <p className="text-sm text-[color:var(--shop-ink-muted)]">
          Telegram did not keep your login in this Mini App, or the secure connection expired.{" "}
          {t("tryAgain")} — reopen Account from the shop menu if it still fails. Confirm the Mini
          App URL in BotFather matches this shop.
        </p>
        <button
          type="button"
          className={shop.btnPrimary}
          onClick={() => {
            try {
              sessionStorage.removeItem(TELEGRAM_ACCOUNT_NAV_KEY);
              sessionStorage.removeItem(TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY);
            } catch {
              // ignore
            }
            startedRef.current = false;
            setNavigationAttempted(false);
            retryAuth();
          }}
        >
          {t("tryAgain")}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-3 pt-6">
      <h1 className="font-[family-name:var(--font-shop-display)] text-2xl tracking-tight">
        {t("connectingTelegram")}
      </h1>
      <p className="text-sm text-[color:var(--shop-ink-muted)]">
        This only takes a moment. Account stays private until your session is ready.
      </p>
    </div>
  );
}
