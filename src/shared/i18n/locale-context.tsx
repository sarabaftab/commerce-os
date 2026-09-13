"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "./locale";
import { DEFAULT_LOCALE } from "./locale";
import { readLocaleFromDocumentCookie, writeLocaleDocumentCookie } from "./locale-cookie";
import { t, type MessageKey } from "./messages";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

function subscribeToLocaleCookie(onStoreChange: () => void) {
  if (typeof window === "undefined") {
    return () => undefined;
  }
  const handler = () => onStoreChange();
  window.addEventListener("commerceos:locale", handler);
  window.addEventListener("focus", handler);
  return () => {
    window.removeEventListener("commerceos:locale", handler);
    window.removeEventListener("focus", handler);
  };
}

function getLocaleSnapshot(): Locale {
  return readLocaleFromDocumentCookie();
}

function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const cookieLocale = useSyncExternalStore(
    subscribeToLocaleCookie,
    getLocaleSnapshot,
    getServerSnapshot,
  );
  const [override, setOverride] = useState<Locale | null>(null);
  const locale = override ?? cookieLocale;

  const setLocale = useCallback(
    (next: Locale) => {
      writeLocaleDocumentCookie(next);
      setOverride(next);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("commerceos:locale"));
      }
      router.refresh();
    },
    [router],
  );

  const value = useMemo<LocaleContextValue>(
    () => ({
      locale,
      setLocale,
      t: (key) => t(locale, key),
    }),
    [locale, setLocale],
  );

  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  const ctx = useContext(LocaleContext);
  if (!ctx) {
    return {
      locale: DEFAULT_LOCALE,
      setLocale: () => undefined,
      t: (key) => t(DEFAULT_LOCALE, key),
    };
  }
  return ctx;
}
