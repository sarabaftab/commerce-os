"use client";

import { useEffect } from "react";

import {
  TELEGRAM_ACCOUNT_ACCESS_QUERY,
  TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY,
} from "@/channels/telegram/account-access-constants";

/**
 * Keep the opaque Account access proof on the URL for RSC + server actions
 * when Desktop cannot persist commerceos_customer. Cookie sessions ignore this.
 */
export function AccountAccessSync() {
  useEffect(() => {
    try {
      const code = sessionStorage.getItem(TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY)?.trim();
      if (!code) {
        return;
      }
      const url = new URL(window.location.href);
      if (url.searchParams.get(TELEGRAM_ACCOUNT_ACCESS_QUERY) === code) {
        return;
      }
      url.searchParams.set(TELEGRAM_ACCOUNT_ACCESS_QUERY, code);
      window.history.replaceState({}, "", `${url.pathname}${url.search}`);
    } catch {
      // sessionStorage may be unavailable; cookie path still works on Mobile.
    }
  }, []);

  return null;
}
