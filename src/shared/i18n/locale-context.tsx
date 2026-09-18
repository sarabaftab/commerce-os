"use client";

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import { useRouter } from "next/navigation";

import type { Locale } from "./locale";
import { DEFAULT_LOCALE, LOCALE_COOKIE_NAME } from "./locale";
import {
  LOCALE_STORAGE_KEY,
  readLocaleFromDocumentCookie,
  writeLocaleDocumentCookie,
} from "./locale-cookie";
import { t, type MessageKey } from "./messages";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

/**
 * In-memory locale survives Soft Navigation remounts of LocaleProvider.
 * Without this, getServerSnapshot(EN) + missing/flaky cookies flip the UI back to English.
 */
let memoryLocale: Locale | null = null;
const listeners = new Set<() => void>();

function hasPersistedLocale(): boolean {
  if (typeof window === "undefined") {
    return false;
  }
  try {
    if (document.cookie.includes(`${LOCALE_COOKIE_NAME}=`)) {
      return true;
    }
    return Boolean(window.sessionStorage.getItem(LOCALE_STORAGE_KEY));
  } catch {
    return false;
  }
}

function emitLocaleChange() {
  listeners.forEach((listener) => listener());
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("commerceos:locale"));
  }
}

function subscribeToLocaleStore(onStoreChange: () => void) {
  listeners.add(onStoreChange);
  if (typeof window === "undefined") {
    return () => {
      listeners.delete(onStoreChange);
    };
  }
  const syncFromStorage = () => {
    const stored = readLocaleFromDocumentCookie();
    // Never wipe an in-session choice if cookie/sessionStorage briefly disappear (Telegram WebView).
    if (hasPersistedLocale() || memoryLocale == null) {
      memoryLocale = stored;
    }
    onStoreChange();
  };
  window.addEventListener("commerceos:locale", onStoreChange);
  window.addEventListener("storage", syncFromStorage);
  window.addEventListener("focus", syncFromStorage);
  return () => {
    listeners.delete(onStoreChange);
    window.removeEventListener("commerceos:locale", onStoreChange);
    window.removeEventListener("storage", syncFromStorage);
    window.removeEventListener("focus", syncFromStorage);
  };
}

function getLocaleSnapshot(): Locale {
  if (memoryLocale != null) {
    return memoryLocale;
  }
  memoryLocale = readLocaleFromDocumentCookie();
  return memoryLocale;
}

/** ISR-safe: cookies are not available during static render. */
function getServerSnapshot(): Locale {
  return DEFAULT_LOCALE;
}

export function LocaleProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const locale = useSyncExternalStore(
    subscribeToLocaleStore,
    getLocaleSnapshot,
    getServerSnapshot,
  );

  const setLocale = useCallback(
    (next: Locale) => {
      memoryLocale = next;
      writeLocaleDocumentCookie(next);
      emitLocaleChange();
      // Refresh force-dynamic server islands (cart/checkout/account) that still read the cookie.
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
