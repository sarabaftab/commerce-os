import { afterEach, describe, expect, it, vi } from "vitest";

import {
  canOpenTelegramLocationSettings,
  isTelegramLocationManagerSupported,
  openTelegramLocationSettings,
  requestTelegramCurrentLocation,
  type TelegramLocationManager,
  type TelegramWebAppLocationHost,
} from "@/channels/telegram/client/telegram-location";

function manager(overrides: Partial<TelegramLocationManager> = {}): TelegramLocationManager {
  return {
    isInited: true,
    isLocationAvailable: true,
    isAccessRequested: false,
    isAccessGranted: true,
    init: (cb) => cb?.(),
    getLocation: (cb) =>
      cb({
        available: true,
        latitude: 11.5564,
        longitude: 104.9282,
        horizontal_accuracy: 12,
      }),
    openSettings: () => undefined,
    ...overrides,
  };
}

function webApp(
  overrides: Partial<TelegramWebAppLocationHost> = {},
): TelegramWebAppLocationHost {
  return {
    version: "8.0",
    isVersionAtLeast: (version) => version <= "8.0",
    LocationManager: manager(),
    ...overrides,
  };
}

describe("Telegram LocationManager capability", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("is supported when init and getLocation exist", () => {
    expect(isTelegramLocationManagerSupported(webApp())).toBe(true);
  });

  it("is unsupported without LocationManager", () => {
    expect(
      isTelegramLocationManagerSupported({
        version: "7.10",
        LocationManager: undefined,
      }),
    ).toBe(false);
  });

  it("is unsupported on older Telegram versions when isVersionAtLeast exists", () => {
    expect(
      isTelegramLocationManagerSupported(
        webApp({
          isVersionAtLeast: () => false,
        }),
      ),
    ).toBe(false);
  });

  it("detects openSettings availability", () => {
    expect(canOpenTelegramLocationSettings(manager())).toBe(true);
    expect(canOpenTelegramLocationSettings(manager({ openSettings: undefined }))).toBe(
      false,
    );
  });
});

describe("requestTelegramCurrentLocation", () => {
  it("returns unsupported when LocationManager is missing", async () => {
    await expect(requestTelegramCurrentLocation({})).resolves.toEqual({
      status: "unsupported",
    });
  });

  it("initializes then returns granted coordinates", async () => {
    const init = vi.fn((cb?: () => void) => cb?.());
    const result = await requestTelegramCurrentLocation(
      webApp({
        LocationManager: manager({
          isInited: false,
          init,
        }),
      }),
    );

    expect(init).toHaveBeenCalledTimes(1);
    expect(result).toEqual({
      status: "granted",
      latitude: 11.5564,
      longitude: 104.9282,
      accuracy: 12,
    });
  });

  it("does not re-prompt when access was already denied", async () => {
    const getLocation = vi.fn();
    const result = await requestTelegramCurrentLocation(
      webApp({
        LocationManager: manager({
          isAccessRequested: true,
          isAccessGranted: false,
          getLocation,
        }),
      }),
    );

    expect(getLocation).not.toHaveBeenCalled();
    expect(result).toEqual({
      status: "denied",
      canOpenSettings: true,
    });
  });

  it("treats available:false as denied when access is not granted", async () => {
    const result = await requestTelegramCurrentLocation(
      webApp({
        LocationManager: manager({
          isAccessRequested: false,
          isAccessGranted: false,
          getLocation: (cb) => cb({ available: false }),
        }),
      }),
    );

    expect(result).toEqual({
      status: "denied",
      canOpenSettings: true,
    });
  });

  it("returns unavailable when the device cannot provide location", async () => {
    const result = await requestTelegramCurrentLocation(
      webApp({
        LocationManager: manager({
          isLocationAvailable: false,
        }),
      }),
    );
    expect(result).toEqual({ status: "unavailable" });
  });

  it("opens settings only when the method exists", () => {
    const openSettings = vi.fn();
    expect(openTelegramLocationSettings(manager({ openSettings }))).toBe(true);
    expect(openSettings).toHaveBeenCalledTimes(1);
    expect(openTelegramLocationSettings(manager({ openSettings: undefined }))).toBe(false);
  });
});
