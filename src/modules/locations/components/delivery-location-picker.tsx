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
import { useLocale } from "@/shared/i18n";

function MapLoadingFallback() {
  const { t } = useLocale();
  return (
    <div className="flex h-52 items-center justify-center bg-[color:var(--shop-surface)] text-sm text-[color:var(--shop-ink-muted)]">
      {t("loadingMap")}
    </div>
  );
}

const DeliveryLocationMap = dynamic(
  () =>
    import("./delivery-location-map").then((mod) => ({
      default: mod.DeliveryLocationMap,
    })),
  {
    ssr: false,
    loading: () => <MapLoadingFallback />,
  },
);

type DeliveryLocationPickerProps = {
  latitude: number | null;
  longitude: number | null;
  confirmed: boolean;
  onDraftChange: (point: LatLng) => void;
  onConfirm: (point: LatLng) => void;
};

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
  const { t } = useLocale();
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const draft = parseOptionalLatLng(latitude, longitude);

  const handleCurrentLocation = useCallback(async () => {
    const webApp = readTelegramWebApp();
    if (!isTelegramLocationManagerSupported(webApp)) {
      setShowSettings(false);
      setStatusMessage(t("locationUnsupported"));
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
        setStatusMessage(t("movePinHint"));
        return;
      }
      if (result.status === "denied") {
        setShowSettings(result.canOpenSettings);
        setStatusMessage(t("locationDenied"));
        return;
      }
      if (result.status === "unsupported") {
        setStatusMessage(t("locationUnsupported"));
        return;
      }
      if (result.status === "unavailable") {
        setStatusMessage(t("locationUnavailable"));
        return;
      }
      setStatusMessage(result.message);
    } finally {
      setBusy(false);
    }
  }, [haptic, onDraftChange, t]);

  const handleConfirm = () => {
    if (!draft) {
      return;
    }
    haptic("light");
    onConfirm(draft);
    setStatusMessage(t("locationConfirmedStatus"));
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
        {busy ? t("gettingLocation") : t("useMyCurrentLocation")}
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
          {t("openLocationSettings")}
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
              setStatusMessage(t("movePinHint"));
            }}
          />
        </div>
      ) : null}

      {draft ? (
        <p className="text-xs text-[color:var(--shop-ink-muted)]">
          {t("movePinHint")}
        </p>
      ) : null}

      {draft ? (
        <button
          type="button"
          onClick={handleConfirm}
          className="flex h-11 w-full items-center justify-center rounded-xl bg-[color:var(--shop-primary)] px-3 text-sm font-semibold text-[color:var(--shop-on-primary)]"
        >
          {needsConfirm ? t("confirmLocation") : t("locationConfirmed")}
        </button>
      ) : null}
    </div>
  );
}
