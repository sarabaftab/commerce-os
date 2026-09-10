import { describe, expect, it, vi } from "vitest";

import {
  applyTelegramViewportCss,
  bindTelegramSafeAreaListeners,
  requestTelegramFullscreenOnce,
  STOREFRONT_HEADER_INSET_STYLE,
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
    expect(style.get("--tg-content-safe-area-inset-top")).toBe("0px");
    expect(style.get("--tg-content-safe-area-inset-left")).toBe("0px");
    expect(style.get("--tg-content-safe-area-inset-right")).toBe("0px");
  });

  it("writes system and content safe-area insets including left/right", () => {
    const style = fakeStyle();
    applyTelegramViewportCss(style as unknown as CSSStyleDeclaration, {
      viewportHeight: 700,
      viewportStableHeight: 700,
      isFullscreen: true,
      safeAreaInset: { top: 47, bottom: 34, left: 0, right: 0 },
      contentSafeAreaInset: { top: 48, bottom: 0, left: 16, right: 72 },
    });

    expect(style.get("--tg-safe-area-inset-top")).toBe("47px");
    expect(style.get("--tg-safe-area-inset-bottom")).toBe("34px");
    expect(style.get("--tg-content-safe-area-inset-top")).toBe("48px");
    expect(style.get("--tg-content-safe-area-inset-bottom")).toBe("0px");
    expect(style.get("--tg-content-safe-area-inset-left")).toBe("16px");
    expect(style.get("--tg-content-safe-area-inset-right")).toBe("72px");
    expect(style.get("--tg-is-fullscreen")).toBe("1");
  });
});

describe("storefront header inset style", () => {
  it("sums system + Telegram content safe areas for the header top inset", () => {
    expect(STOREFRONT_HEADER_INSET_STYLE.paddingTop).toContain(
      "--tg-safe-area-inset-top",
    );
    expect(STOREFRONT_HEADER_INSET_STYLE.paddingTop).toContain(
      "--tg-content-safe-area-inset-top",
    );
    expect(STOREFRONT_HEADER_INSET_STYLE.paddingTop).toContain("calc(");
  });

  it("pads left/right with Telegram content safe area so native controls clear logo/cart", () => {
    expect(STOREFRONT_HEADER_INSET_STYLE.paddingLeft).toContain(
      "--tg-content-safe-area-inset-left",
    );
    expect(STOREFRONT_HEADER_INSET_STYLE.paddingRight).toContain(
      "--tg-content-safe-area-inset-right",
    );
  });

  it("falls back to browser env() safe-area and 0px Telegram content insets", () => {
    expect(STOREFRONT_HEADER_INSET_STYLE.paddingTop).toContain(
      "env(safe-area-inset-top, 0px)",
    );
    expect(STOREFRONT_HEADER_INSET_STYLE.paddingLeft).toContain("0px");
    expect(STOREFRONT_HEADER_INSET_STYLE.paddingRight).toContain("0px");
  });
});

describe("Telegram safe-area listeners", () => {
  it("subscribes to viewport and safe-area events and requests current insets", () => {
    const onEvent = vi.fn();
    const offEvent = vi.fn();
    const requestSafeArea = vi.fn();
    const requestContentSafeArea = vi.fn();
    const onUpdate = vi.fn();

    const unbind = bindTelegramSafeAreaListeners(
      {
        viewportHeight: 700,
        viewportStableHeight: 700,
        onEvent,
        offEvent,
        requestSafeArea,
        requestContentSafeArea,
      },
      onUpdate,
    );

    expect(onEvent.mock.calls.map((call) => call[0])).toEqual([
      "viewportChanged",
      "safeAreaChanged",
      "contentSafeAreaChanged",
      "fullscreenChanged",
    ]);
    expect(requestSafeArea).toHaveBeenCalledTimes(1);
    expect(requestContentSafeArea).toHaveBeenCalledTimes(1);

    unbind();
    expect(offEvent).toHaveBeenCalledTimes(4);
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
