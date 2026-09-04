import { describe, expect, it, vi } from "vitest";

import {
  applyTelegramViewportCss,
  requestTelegramFullscreenOnce,
} from "@/channels/telegram/client/telegram-viewport";

function fakeStyle() {
  const values = new Map<string, string>();
  return {
    setProperty: (key: string, value: string) => {
      values.set(key, value);
    },
    get: (key: string) => values.get(key),
    values,
  };
}

describe("Telegram viewport CSS sync", () => {
  it("writes live and stable viewport heights separately", () => {
    const style = fakeStyle();
    applyTelegramViewportCss(style as unknown as CSSStyleDeclaration, {
      viewportHeight: 640,
      viewportStableHeight: 720,
      viewportWidth: 390,
    });

    expect(style.get("--tg-viewport-height")).toBe("640px");
    expect(style.get("--tg-viewport-stable-height")).toBe("720px");
    expect(style.get("--tg-viewport-width")).toBe("390px");
    expect(style.get("--tg-safe-area-inset-top")).toBe("env(safe-area-inset-top, 0px)");
  });

  it("prefers Telegram safe-area insets when provided", () => {
    const style = fakeStyle();
    applyTelegramViewportCss(style as unknown as CSSStyleDeclaration, {
      viewportHeight: 700,
      viewportStableHeight: 700,
      safeAreaInset: { top: 12, bottom: 24, left: 0, right: 0 },
      contentSafeAreaInset: { top: 8, bottom: 16 },
    });

    expect(style.get("--tg-safe-area-inset-top")).toBe("12px");
    expect(style.get("--tg-safe-area-inset-bottom")).toBe("24px");
    expect(style.get("--tg-content-safe-area-inset-top")).toBe("8px");
    expect(style.get("--tg-content-safe-area-inset-bottom")).toBe("16px");
  });
});

describe("Telegram fullscreen request", () => {
  it("requests fullscreen once when supported", () => {
    const requestFullscreen = vi.fn();
    const first = requestTelegramFullscreenOnce(
      { requestFullscreen, isFullscreen: false },
      false,
    );
    const second = requestTelegramFullscreenOnce(
      { requestFullscreen, isFullscreen: false },
      true,
    );

    expect(first).toBe(true);
    expect(second).toBe(false);
    expect(requestFullscreen).toHaveBeenCalledTimes(1);
  });

  it("skips when the API is missing or already fullscreen", () => {
    expect(requestTelegramFullscreenOnce({}, false)).toBe(false);
    expect(
      requestTelegramFullscreenOnce(
        { requestFullscreen: vi.fn(), isFullscreen: true },
        false,
      ),
    ).toBe(false);
  });

  it("swallows requestFullscreen errors", () => {
    expect(
      requestTelegramFullscreenOnce(
        {
          requestFullscreen: () => {
            throw new Error("unsupported");
          },
        },
        false,
      ),
    ).toBe(false);
  });
});
