/**
 * Telegram Mini App viewport helpers.
 * Safe to call only when `window.Telegram.WebApp` is present.
 */

export type TelegramViewportSource = {
  viewportHeight: number;
  viewportStableHeight: number;
  /** Present on some clients / events; optional. */
  viewportWidth?: number;
  safeAreaInset?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
  contentSafeAreaInset?: {
    top?: number;
    bottom?: number;
    left?: number;
    right?: number;
  };
};

function px(value: number | undefined, fallback = "0px"): string {
  if (typeof value === "number" && Number.isFinite(value)) {
    return `${value}px`;
  }
  return fallback;
}

/** Mirror Telegram viewport metrics into CSS variables on :root. */
export function applyTelegramViewportCss(
  style: CSSStyleDeclaration,
  webApp: TelegramViewportSource,
): void {
  const liveHeight = webApp.viewportHeight;
  const stableHeight = webApp.viewportStableHeight || webApp.viewportHeight;

  style.setProperty("--tg-viewport-height", px(liveHeight, "100dvh"));
  style.setProperty("--tg-viewport-stable-height", px(stableHeight, "100dvh"));

  if (typeof webApp.viewportWidth === "number" && webApp.viewportWidth > 0) {
    style.setProperty("--tg-viewport-width", px(webApp.viewportWidth));
  }

  const safe = webApp.safeAreaInset;
  if (safe) {
    style.setProperty("--tg-safe-area-inset-top", px(safe.top, "env(safe-area-inset-top, 0px)"));
    style.setProperty(
      "--tg-safe-area-inset-bottom",
      px(safe.bottom, "env(safe-area-inset-bottom, 0px)"),
    );
    style.setProperty("--tg-safe-area-inset-left", px(safe.left, "0px"));
    style.setProperty("--tg-safe-area-inset-right", px(safe.right, "0px"));
  } else {
    style.setProperty("--tg-safe-area-inset-top", "env(safe-area-inset-top, 0px)");
    style.setProperty("--tg-safe-area-inset-bottom", "env(safe-area-inset-bottom, 0px)");
  }

  const contentSafe = webApp.contentSafeAreaInset;
  if (contentSafe) {
    style.setProperty("--tg-content-safe-area-inset-top", px(contentSafe.top));
    style.setProperty("--tg-content-safe-area-inset-bottom", px(contentSafe.bottom));
  }
}

type TelegramFullscreenCapable = {
  requestFullscreen?: () => void;
  isFullscreen?: boolean;
};

/**
 * Request fullscreen once when the client supports Bot API 8.0+.
 * Never throws — older clients simply skip.
 */
export function requestTelegramFullscreenOnce(
  webApp: TelegramFullscreenCapable,
  alreadyRequested: boolean,
): boolean {
  if (alreadyRequested) {
    return false;
  }
  if (typeof webApp.requestFullscreen !== "function") {
    return false;
  }
  if (webApp.isFullscreen) {
    return false;
  }
  try {
    webApp.requestFullscreen();
    return true;
  } catch {
    return false;
  }
}
