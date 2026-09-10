/**
 * Telegram Mini App viewport helpers.
 * Safe to call only when `window.Telegram.WebApp` is present.
 */

export type TelegramViewportSource = {
  viewportHeight: number;
  viewportStableHeight: number;
  /** Present on some clients / events; optional. */
  viewportWidth?: number;
  isFullscreen?: boolean;
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

/**
 * Mirror Telegram viewport + safe-area metrics into CSS variables on :root.
 *
 * Fullscreen native controls (Back / More / Collapse) live in
 * `contentSafeAreaInset`. Device notch / home indicator live in `safeAreaInset`.
 * Header chrome must sum them — using only `safeAreaInset` leaves content under Telegram UI.
 */
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
    style.setProperty("--tg-safe-area-inset-left", "0px");
    style.setProperty("--tg-safe-area-inset-right", "0px");
  }

  const contentSafe = webApp.contentSafeAreaInset;
  style.setProperty("--tg-content-safe-area-inset-top", px(contentSafe?.top, "0px"));
  style.setProperty("--tg-content-safe-area-inset-bottom", px(contentSafe?.bottom, "0px"));
  style.setProperty("--tg-content-safe-area-inset-left", px(contentSafe?.left, "0px"));
  style.setProperty("--tg-content-safe-area-inset-right", px(contentSafe?.right, "0px"));

  if (webApp.isFullscreen) {
    style.setProperty("--tg-is-fullscreen", "1");
  } else {
    style.setProperty("--tg-is-fullscreen", "0");
  }
}

/** CSS for storefront sticky header — below Telegram fullscreen chrome + device safe area. */
export const STOREFRONT_HEADER_INSET_STYLE = {
  paddingTop:
    "max(0.75rem, calc(var(--tg-safe-area-inset-top, env(safe-area-inset-top, 0px)) + var(--tg-content-safe-area-inset-top, 0px)))",
  paddingLeft: "calc(1rem + var(--tg-content-safe-area-inset-left, 0px))",
  paddingRight: "calc(1rem + var(--tg-content-safe-area-inset-right, 0px))",
  paddingBottom: "0.75rem",
} as const;

type TelegramSafeAreaCapable = {
  onEvent: (event: string, cb: () => void) => void;
  offEvent: (event: string, cb: () => void) => void;
  requestSafeArea?: () => void;
  requestContentSafeArea?: () => void;
};

const SAFE_AREA_EVENTS = [
  "viewportChanged",
  "safeAreaChanged",
  "contentSafeAreaChanged",
  "fullscreenChanged",
] as const;

/**
 * Keep CSS vars in sync when Telegram changes viewport / safe areas / fullscreen.
 * Also nudges Telegram to publish current insets when the APIs exist.
 */
export function bindTelegramSafeAreaListeners(
  webApp: TelegramSafeAreaCapable & TelegramViewportSource,
  onUpdate: () => void,
): () => void {
  for (const event of SAFE_AREA_EVENTS) {
    webApp.onEvent(event, onUpdate);
  }

  try {
    webApp.requestSafeArea?.();
  } catch {
    // Older clients — ignore.
  }
  try {
    webApp.requestContentSafeArea?.();
  } catch {
    // Older clients — ignore.
  }

  return () => {
    for (const event of SAFE_AREA_EVENTS) {
      webApp.offEvent(event, onUpdate);
    }
  };
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
