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

import { waitForTelegramInitData } from "@/channels/telegram/client/wait-for-init-data";
import {
  applyTelegramViewportCss,
  requestTelegramFullscreenOnce,
} from "@/channels/telegram/client/telegram-viewport";

type TelegramThemeParams = {
  bg_color?: string;
  text_color?: string;
  hint_color?: string;
  link_color?: string;
  button_color?: string;
  button_text_color?: string;
  secondary_bg_color?: string;
};

type TelegramSafeAreaInset = {
  top?: number;
  bottom?: number;
  left?: number;
  right?: number;
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
  viewportWidth?: number;
  isFullscreen?: boolean;
  safeAreaInset?: TelegramSafeAreaInset;
  contentSafeAreaInset?: TelegramSafeAreaInset;
  ready: () => void;
  expand: () => void;
  requestFullscreen?: () => void;
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
  retryAuth: () => void;
};

const TelegramContext = createContext<TelegramContextValue>({
  isTelegram: false,
  ready: false,
  authStatus: "idle",
  displayName: null,
  colorScheme: null,
  themeParams: {},
  retryAuth: () => undefined,
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
  /** True when a customer session cookie is already present (SSR hint). */
  initiallyAuthenticated?: boolean;
  children: ReactNode;
};

/** In-flight dedupe across Strict Mode remounts (same tab). */
const authInflight = new Map<string, Promise<AuthResponse>>();

type AuthResponse = {
  ok: boolean;
  displayName: string | null;
  sessionReused: boolean;
  mergedGuestCart: boolean;
  isNewCustomer: boolean;
};

async function postTelegramAuth(
  tenantSlug: string,
  initData: string,
): Promise<AuthResponse> {
  const key = `${tenantSlug}:${initData.slice(0, 64)}`;
  const existing = authInflight.get(key);
  if (existing) {
    return existing;
  }

  const promise = (async (): Promise<AuthResponse> => {
    try {
      const res = await fetch(`/api/v1/${tenantSlug}/telegram/auth`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ initData }),
        credentials: "include",
        cache: "no-store",
      });
      if (!res.ok) {
        return {
          ok: false,
          displayName: null,
          sessionReused: false,
          mergedGuestCart: false,
          isNewCustomer: false,
        };
      }
      const payload = (await res.json()) as {
        data?: {
          displayName?: string;
          sessionReused?: boolean;
          mergedGuestCart?: boolean;
          isNewCustomer?: boolean;
        };
      };
      return {
        ok: true,
        displayName: payload.data?.displayName ?? null,
        sessionReused: Boolean(payload.data?.sessionReused),
        mergedGuestCart: Boolean(payload.data?.mergedGuestCart),
        isNewCustomer: Boolean(payload.data?.isNewCustomer),
      };
    } finally {
      authInflight.delete(key);
    }
  })();

  authInflight.set(key, promise);
  return promise;
}

export function TelegramProvider({
  tenantSlug,
  initiallyAuthenticated = false,
  children,
}: TelegramProviderProps) {
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
  const initiallyAuthenticatedRef = useRef(initiallyAuthenticated);
  initiallyAuthenticatedRef.current = initiallyAuthenticated;
  const cancelledRef = useRef(false);
  const webAppRef = useRef<TelegramWebApp | undefined>(undefined);

  const authenticate = useCallback(async (initData: string) => {
    setAuthStatus("loading");
    try {
      const result = await postTelegramAuth(tenantSlug, initData);
      if (cancelledRef.current) return;
      if (!result.ok) {
        setAuthStatus("error");
        return;
      }
      setDisplayName(result.displayName);
      setAuthStatus("authenticated");

      const needsRefresh =
        result.mergedGuestCart ||
        result.isNewCustomer ||
        (!result.sessionReused && !initiallyAuthenticatedRef.current);

      if (needsRefresh) {
        routerRef.current.refresh();
      }
    } catch {
      if (!cancelledRef.current) {
        setAuthStatus("error");
      }
    }
  }, [tenantSlug]);

  const retryAuth = useCallback(() => {
    const app = webAppRef.current ?? window.Telegram?.WebApp;
    if (!app) {
      return;
    }
    void (async () => {
      setAuthStatus("loading");
      const initData = await waitForTelegramInitData(() => app.initData);
      if (cancelledRef.current) return;
      if (!initData) {
        setAuthStatus("error");
        return;
      }
      await authenticate(initData);
    })();
  }, [authenticate]);

  useEffect(() => {
    cancelledRef.current = false;
    let webApp: TelegramWebApp | undefined;
    let onThemeChanged: (() => void) | undefined;
    let onViewportChanged: (() => void) | undefined;
    let fullscreenRequested = false;

    async function boot() {
      await loadTelegramScript();
      if (cancelledRef.current) return;

      webApp = window.Telegram?.WebApp;
      webAppRef.current = webApp;
      if (!webApp) {
        setReady(true);
        setAuthStatus("skipped");
        return;
      }

      setIsTelegram(true);
      webApp.ready();
      webApp.expand();
      fullscreenRequested =
        requestTelegramFullscreenOnce(webApp, fullscreenRequested) || fullscreenRequested;
      webApp.enableClosingConfirmation?.();
      syncThemeFromWebApp(webApp, setColorScheme, setThemeParams);

      const root = document.documentElement;
      applyTelegramViewportCss(root.style, webApp);

      onThemeChanged = () => {
        if (webApp) syncThemeFromWebApp(webApp, setColorScheme, setThemeParams);
      };
      onViewportChanged = () => {
        if (!webApp) return;
        applyTelegramViewportCss(root.style, {
          ...webApp,
          viewportWidth: webApp.viewportWidth ?? window.innerWidth,
        });
      };
      webApp.onEvent("themeChanged", onThemeChanged);
      webApp.onEvent("viewportChanged", onViewportChanged);

      setReady(true);
      setAuthStatus("loading");
      const initData = await waitForTelegramInitData(() => webApp?.initData);
      if (cancelledRef.current) return;
      if (!initData) {
        setAuthStatus("error");
        return;
      }
      await authenticate(initData);
    }

    void boot();

    return () => {
      cancelledRef.current = true;
      if (webApp && onThemeChanged) {
        webApp.offEvent("themeChanged", onThemeChanged);
      }
      if (webApp && onViewportChanged) {
        webApp.offEvent("viewportChanged", onViewportChanged);
      }
    };
  }, [authenticate, tenantSlug]);

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
      retryAuth,
    }),
    [isTelegram, ready, authStatus, displayName, colorScheme, themeParams, retryAuth],
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
