"use client";

import dynamic from "next/dynamic";
import { useCallback, useState } from "react";

import {
  getTelegramLocationManager,
  isTelegramLocationManagerSupported,
  openTelegramLocationSettings,
  requestTelegramCurrentLocation,
  type TelegramWebAppLocationHost,
} from "@/channels/telegram/client/telegram-location";
import { useTelegramHaptics } from "@/channels/telegram/client/telegram-provider";
import {
  parseOptionalLatLng,
  sameLatLng,
  type LatLng,
} from "@/modules/locations/coordinates";

const DeliveryLocationMap = dynamic(
  () =>
    import("./delivery-location-map").then((mod) => ({
      default: mod.DeliveryLocationMap,
    })),
  {
    ssr: false,
    loading: () => (
      <div className="flex h-52 items-center justify-center bg-[color:var(--shop-surface)] text-sm text-[color:var(--shop-ink-muted)]">
        Loading map…
      </div>
    ),
  },
);

type DeliveryLocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  confirmed: boolean;
  onDraftChange: (point: LatLng) => void;
  onConfirm: (point: LatLng) => void;
};

const UNSUPPORTED_MESSAGE =
  "Current location is not supported by this Telegram version. Please search for your delivery location manually.";

const DENIED_MESSAGE =
  "Location access is needed to use your current location. You can enable it in Telegram settings or search for your address manually.";

function readTelegramWebApp(): TelegramWebAppLocationHost | undefined {
  if (typeof window === "undefined") {
    return undefined;
  }
  return window.Telegram?.WebApp as TelegramWebAppLocationHost | undefined;
}

export function DeliveryLocationPicker({
  latitude,
  longitude,
  confirmed,
  onDraftChange,
  onConfirm,
}: DeliveryLocationPickerProps) {
  const haptic = useTelegramHaptics();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const draft = parseOptionalLatLng(latitude, longitude);

  const handleCurrentLocation = useCallback(async () => {
    const webApp = readTelegramWebApp();
    if (!isTelegramLocationManagerSupported(webApp)) {
      setShowSettings(false);
      setStatusMessage(UNSUPPORTED_MESSAGE);
      return;
    }

    setBusy(true);
    setShowSettings(false);
    setStatusMessage(null);
    try {
      const result = await requestTelegramCurrentLocation(webApp);
      if (result.status === "granted") {
        haptic("medium");
        onDraftChange({
          latitude: result.latitude,
          longitude: result.longitude,
        });
        setStatusMessage("Move the pin to your exact delivery location.");
        return;
      }
      if (result.status === "denied") {
        setShowSettings(result.canOpenSettings);
        setStatusMessage(DENIED_MESSAGE);
        return;
      }
      if (result.status === "unsupported") {
        setStatusMessage(UNSUPPORTED_MESSAGE);
        return;
      }
      if (result.status === "unavailable") {
        setStatusMessage(
          "Telegram could not read your current location. Search for your address instead.",
        );
        return;
      }
      setStatusMessage(result.message);
    } finally {
      setBusy(false);
    }
  }, [haptic, onDraftChange]);

  const handleConfirm = () => {
    if (!draft) {
      return;
    }
    haptic("light");
    onConfirm(draft);
    setStatusMessage("Delivery location confirmed.");
  };

  const needsConfirm = Boolean(draft && !confirmed);

  return (
    <div className="space-y-3">
      <button
        type="button"
        disabled={busy}
        onClick={() => void handleCurrentLocation()}
        className="flex h-11 w-full items-center justify-center rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface)] px-3 text-sm font-medium text-[color:var(--shop-ink)] disabled:opacity-60"
      >
        {busy ? "Getting location…" : "📍 Use My Current Location"}
      </button>

      {statusMessage ? (
        <p role="status" className="text-xs leading-relaxed text-[color:var(--shop-ink-muted)]">
          {statusMessage}
        </p>
      ) : null}

      {showSettings ? (
        <button
          type="button"
          className="text-xs font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
          onClick={() => {
            openTelegramLocationSettings(getTelegramLocationManager(readTelegramWebApp()));
          }}
        >
          Open Location Settings
        </button>
      ) : null}

      {draft ? (
        <div className="overflow-hidden rounded-xl ring-1 ring-[color:var(--shop-line)]">
          <DeliveryLocationMap
            point={draft}
            onPointChange={(next) => {
              if (draft && sameLatLng(draft, next)) {
                return;
              }
              onDraftChange(next);
              setStatusMessage("Move the pin to your exact delivery location.");
            }}
          />
        </div>
      ) : null}

      {draft ? (
        <p className="text-xs text-[color:var(--shop-ink-muted)]">
          Move the pin to your exact delivery location.
        </p>
      ) : null}

      {draft ? (
        <button
          type="button"
          onClick={handleConfirm}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-[color:var(--shop-primary)] px-3 text-sm font-semibold text-[color:var(--shop-on-primary)]"
        >
          {needsConfirm ? "Confirm Location" : "Location confirmed"}
        </button>
      ) : null}
    </div>
  );
}
