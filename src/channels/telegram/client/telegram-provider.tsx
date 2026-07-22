"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { usePathname, useRouter } from "next/navigation";

type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type TelegramWebApp = {
  initData: string;
  initDataUnsafe: {
    user?: { id: number; first_name?: string; last_name?: string; username?: string };
    start_param?: string;
  };
  colorScheme: "light" | "dark";
  themeParams: TelegramThemeParams;
  isExpanded: boolean;
  viewportHeight: number;
  viewportStableHeight: number;
  ready: () => void;
  expand: () => void;
  close: () => void;
  BackButton: {
    isVisible: boolean;
    show: () => void;
    hide: () => void;
    onClick: (cb: () => void) => void;
    offClick: (cb: () => void) => void;
  };
  HapticFeedback?: {
    impactOccurred: (style: "light" | "medium" | "heavy" | "rigid" | "soft") => void;
  };
  onEvent: (event: string, cb: () => void) => void;
  offEvent: (event: string, cb: () => void) => void;
  setHeaderColor?: (color: string) => void;
  setBackgroundColor?: (color: string) => void;
  enableClosingConfirmation?: () => void;
  disableClosingConfirmation?: () => void;
};

declare global {
  interface Window {
    Telegram?: { WebApp?: TelegramWebApp };
  }
}

type TelegramContextValue = {
  isTelegram: boolean;
  ready: boolean;
  authStatus: "idle" | "loading" | "authenticated" | "error" | "skipped";
  displayName: string | null;
  colorScheme: "light" | "dark" | null;
  themeParams: TelegramThemeParams;
};

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  ready: false,
  authStatus: "idle",
  displayName: null,
  colorScheme: null,
  themeParams: {},
});

function applyThemeCss(theme: TelegramThemeParams, colorScheme: "light" | "dark") {
  const root = document.documentElement;
  root.dataset.telegram = "1";
  root.dataset.telegramColorScheme = colorScheme;
  if (theme.bg_color) {
    root.style.setProperty("--tg-bg", theme.bg_color);
  }
  if (theme.text_color) {
    root.style.setProperty("--tg-text", theme.text_color);
  }
  if (theme.hint_color) {
    root.style.setProperty("--tg-hint", theme.hint_color);
  }
  if (theme.button_color) {
    root.style.setProperty("--tg-button", theme.button_color);
  }
  if (theme.secondary_bg_color) {
    root.style.setProperty("--tg-secondary-bg", theme.secondary_bg_color);
  }
}

function syncThemeFromWebApp(
  webApp: TelegramWebApp,
  setColorScheme: (scheme: "light" | "dark") => void,
  setThemeParams: (theme: TelegramThemeParams) => void,
) {
  setColorScheme(webApp.colorScheme);
  setThemeParams(webApp.themeParams ?? {});
  applyThemeCss(webApp.themeParams ?? {}, webApp.colorScheme);
  if (webApp.themeParams.bg_color && webApp.setBackgroundColor) {
    webApp.setBackgroundColor(webApp.themeParams.bg_color);
  }
  if (webApp.themeParams.bg_color && webApp.setHeaderColor) {
    webApp.setHeaderColor(webApp.themeParams.bg_color);
  }
}

function loadTelegramScript(): Promise<void> {
  if (typeof window === "undefined") {
    return Promise.resolve();
  }
  if (window.Telegram?.WebApp) {
    return Promise.resolve();
  }
  return new Promise((resolve) => {
    const existing = document.querySelector<HTMLScriptElement>(
      "script[data-telegram-web-app]",
    );
    if (existing) {
      existing.addEventListener("load", () => resolve(), { once: true });
      return;
    }
    const script = document.createElement("script");
    script.src = "https://telegram.org/js/telegram-web-app.js";
    script.async = true;
    script.dataset.telegramWebApp = "1";
    script.onload = () => resolve();
    script.onerror = () => resolve();
    document.head.appendChild(script);
  });
}

type TelegramProviderProps = {
  tenantSlug: string;
  children: ReactNode;
};

export function TelegramProvider({ tenantSlug, children }: TelegramProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [ready, setReady] = useState(false);
  const [isTelegram, setIsTelegram] = useState(false);
  const [authStatus, setAuthStatus] = useState<TelegramContextValue["authStatus"]>("idle");
  const [displayName, setDisplayName] = useState<string | null>(null);
  const [colorScheme, setColorScheme] = useState<"light" | "dark" | null>(null);
  const [themeParams, setThemeParams] = useState<TelegramThemeParams>({});
  const routerRef = useRef(router);
  routerRef.current = router;

  useEffect(() => {
    let cancelled = false;
    let webApp: TelegramWebApp | undefined;
    let onThemeChanged: (() => void) | undefined;
    let onViewportChanged: (() => void) | undefined;

    async function authenticate(app: TelegramWebApp) {
      if (!app.initData) {
        setAuthStatus("skipped");
        return;
      }
      setAuthStatus("loading");
      try {
        const res = await fetch(`/api/v1/${tenantSlug}/telegram/auth`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ initData: app.initData }),
          credentials: "include",
        });
        if (cancelled) return;
        if (!res.ok) {
          setAuthStatus("error");
          return;
        }
        const payload = (await res.json()) as {
          data?: { displayName?: string };
        };
        setDisplayName(payload.data?.displayName ?? null);
        setAuthStatus("authenticated");
        routerRef.current.refresh();
      } catch {
        if (!cancelled) {
          setAuthStatus("error");
        }
      }
    }

    async function boot() {
      await loadTelegramScript();
      if (cancelled) return;

      webApp = window.Telegram?.WebApp;
      if (!webApp?.initData) {
        setReady(true);
        setAuthStatus("skipped");
        return;
      }

      setIsTelegram(true);
      webApp.ready();
      webApp.expand();
      webApp.enableClosingConfirmation?.();
      syncThemeFromWebApp(webApp, setColorScheme, setThemeParams);

      const root = document.documentElement;
      root.style.setProperty(
        "--tg-viewport-height",
        `${webApp.viewportStableHeight || webApp.viewportHeight}px`,
      );
      root.style.setProperty(
        "--tg-safe-area-inset-top",
        "env(safe-area-inset-top, 0px)",
      );
      root.style.setProperty(
        "--tg-safe-area-inset-bottom",
        "env(safe-area-inset-bottom, 0px)",
      );

      onThemeChanged = () => {
        if (webApp) syncThemeFromWebApp(webApp, setColorScheme, setThemeParams);
      };
      onViewportChanged = () => {
        if (!webApp) return;
        root.style.setProperty(
          "--tg-viewport-height",
          `${webApp.viewportStableHeight || webApp.viewportHeight}px`,
        );
      };
      webApp.onEvent("themeChanged", onThemeChanged);
      webApp.onEvent("viewportChanged", onViewportChanged);

      await authenticate(webApp);
      if (!cancelled) {
        setReady(true);
      }
    }

    void boot();

    return () => {
      cancelled = true;
      if (webApp && onThemeChanged) {
        webApp.offEvent("themeChanged", onThemeChanged);
      }
      if (webApp && onViewportChanged) {
        webApp.offEvent("viewportChanged", onViewportChanged);
      }
    };
  }, [tenantSlug]);

  useEffect(() => {
    const webApp = window.Telegram?.WebApp;
    if (!webApp || !isTelegram) {
      return;
    }

    const base = `/${tenantSlug}`;
    const isRoot = pathname === base || pathname === `${base}/`;

    const onBack = () => {
      if (window.history.length > 1) {
        router.back();
      } else {
        router.push(base);
      }
    };

    if (isRoot) {
      webApp.BackButton.hide();
      return;
    }

    webApp.BackButton.onClick(onBack);
    webApp.BackButton.show();
    return () => {
      webApp.BackButton.offClick(onBack);
      webApp.BackButton.hide();
    };
  }, [isTelegram, pathname, router, tenantSlug]);

  const value = useMemo<TelegramContextValue>(
    () => ({
      isTelegram,
      ready,
      authStatus,
      displayName,
      colorScheme,
      themeParams,
    }),
    [isTelegram, ready, authStatus, displayName, colorScheme, themeParams],
  );

  return (
    <TelegramContext.Provider value={value}>{children}</TelegramContext.Provider>
  );
}

export function useTelegram() {
  return useContext(TelegramContext);
}

export function useTelegramHaptics() {
  const { isTelegram } = useTelegram();
  return useCallback(
    (style: "light" | "medium" | "heavy" = "light") => {
      if (!isTelegram) return;
      window.Telegram?.WebApp?.HapticFeedback?.impactOccurred(style);
    },
    [isTelegram],
  );
}
