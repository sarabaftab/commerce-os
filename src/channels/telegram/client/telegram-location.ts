/**
 * Telegram Mini App LocationManager adapter.
 *
 * One-shot current-location request only. Never uses navigator.geolocation.
 */

export type TelegramLocationData = {
  available?: boolean;
  latitude?: number;
  longitude?: number;
  horizontal_accuracy?: number;
  horizontalAccuracy?: number;
};

export type TelegramLocationManager = {
  isInited?: boolean;
  isLocationAvailable?: boolean;
  isAccessRequested?: boolean;
  isAccessGranted?: boolean;
  init?: (callback?: () => void) => void;
  getLocation?: (callback: (data: TelegramLocationData) => void) => void;
  openSettings?: () => void;
};

export type TelegramWebAppLocationHost = {
  version?: string;
  isVersionAtLeast?: (version: string) => boolean;
  LocationManager?: TelegramLocationManager;
};

export type TelegramLocationResult =
  | {
      status: "granted";
      latitude: number;
      longitude: number;
      accuracy: number | null;
    }
  | { status: "denied"; canOpenSettings: boolean }
  | { status: "unsupported" }
  | { status: "unavailable" }
  | { status: "error"; message: string };

const LOCATION_MANAGER_MIN_VERSION = "8.0";
const INIT_TIMEOUT_MS = 8_000;
const GET_LOCATION_TIMEOUT_MS = 12_000;

export function canOpenTelegramLocationSettings(
  manager: TelegramLocationManager | null | undefined,
): boolean {
  return typeof manager?.openSettings === "function";
}

export function isTelegramLocationManagerSupported(
  webApp: TelegramWebAppLocationHost | null | undefined,
): boolean {
  if (!webApp) {
    return false;
  }
  const manager = webApp.LocationManager;
  if (typeof manager?.init !== "function" || typeof manager.getLocation !== "function") {
    return false;
  }
  if (typeof webApp.isVersionAtLeast === "function") {
    try {
      if (!webApp.isVersionAtLeast(LOCATION_MANAGER_MIN_VERSION)) {
        return false;
      }
    } catch {
      // Presence of init/getLocation is enough if version check throws.
    }
  }
  return true;
}

export function getTelegramLocationManager(
  webApp: TelegramWebAppLocationHost | null | undefined = typeof window === "undefined"
    ? undefined
    : (window.Telegram?.WebApp as TelegramWebAppLocationHost | undefined),
): TelegramLocationManager | null {
  if (!isTelegramLocationManagerSupported(webApp) || !webApp?.LocationManager) {
    return null;
  }
  return webApp.LocationManager;
}

function initLocationManager(manager: TelegramLocationManager): Promise<void> {
  if (manager.isInited) {
    return Promise.resolve();
  }
  return new Promise((resolve, reject) => {
    if (typeof manager.init !== "function") {
      reject(new Error("LocationManager.init is not available"));
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      if (manager.isInited) {
        resolve();
        return;
      }
      reject(new Error("LocationManager.init timed out"));
    }, INIT_TIMEOUT_MS);

    try {
      manager.init(() => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve();
      });
    } catch (error) {
      settled = true;
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error("LocationManager.init failed"));
    }
  });
}

function readAccuracy(data: TelegramLocationData): number | null {
  const raw = data.horizontal_accuracy ?? data.horizontalAccuracy;
  return typeof raw === "number" && Number.isFinite(raw) ? raw : null;
}

function getLocationOnce(manager: TelegramLocationManager): Promise<TelegramLocationData> {
  return new Promise((resolve, reject) => {
    if (typeof manager.getLocation !== "function") {
      reject(new Error("LocationManager.getLocation is not available"));
      return;
    }
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) {
        return;
      }
      settled = true;
      reject(new Error("Location request timed out"));
    }, GET_LOCATION_TIMEOUT_MS);

    try {
      manager.getLocation((data) => {
        if (settled) {
          return;
        }
        settled = true;
        clearTimeout(timer);
        resolve(data ?? {});
      });
    } catch (error) {
      settled = true;
      clearTimeout(timer);
      reject(error instanceof Error ? error : new Error("LocationManager.getLocation failed"));
    }
  });
}

export function openTelegramLocationSettings(
  manager: TelegramLocationManager | null | undefined = getTelegramLocationManager(),
): boolean {
  if (!canOpenTelegramLocationSettings(manager) || typeof manager?.openSettings !== "function") {
    return false;
  }
  try {
    manager.openSettings();
    return true;
  } catch {
    return false;
  }
}

/**
 * Request a single current location from Telegram.
 * Does not poll, track, or fall back to the browser Geolocation API.
 */
export async function requestTelegramCurrentLocation(
  webApp: TelegramWebAppLocationHost | null | undefined = typeof window === "undefined"
    ? undefined
    : (window.Telegram?.WebApp as TelegramWebAppLocationHost | undefined),
): Promise<TelegramLocationResult> {
  if (!isTelegramLocationManagerSupported(webApp)) {
    return { status: "unsupported" };
  }

  const manager = webApp!.LocationManager!;
  try {
    await initLocationManager(manager);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not initialize location",
    };
  }

  if (manager.isLocationAvailable === false) {
    return { status: "unavailable" };
  }

  // Already asked and denied — do not prompt again; offer Settings instead.
  if (manager.isAccessRequested === true && manager.isAccessGranted === false) {
    return {
      status: "denied",
      canOpenSettings: canOpenTelegramLocationSettings(manager),
    };
  }

  let data: TelegramLocationData;
  try {
    data = await getLocationOnce(manager);
  } catch (error) {
    return {
      status: "error",
      message: error instanceof Error ? error.message : "Could not read location",
    };
  }

  if (data.available === false) {
    if (manager.isAccessGranted === false) {
      return {
        status: "denied",
        canOpenSettings: canOpenTelegramLocationSettings(manager),
      };
    }
    return { status: "unavailable" };
  }

  const latitude = data.latitude;
  const longitude = data.longitude;
  if (
    typeof latitude !== "number" ||
    typeof longitude !== "number" ||
    !Number.isFinite(latitude) ||
    !Number.isFinite(longitude)
  ) {
    return { status: "unavailable" };
  }

  return {
    status: "granted",
    latitude,
    longitude,
    accuracy: readAccuracy(data),
  };
}
