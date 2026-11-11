"use client";

import { useState } from "react";

import { DeliveryLocationPicker } from "@/modules/locations/components/delivery-location-picker";
import { LocationAutocomplete } from "@/modules/locations/components/location-autocomplete";
import { parseOptionalLatLng, type LatLng } from "@/modules/locations/coordinates";
import {
  addressFieldsFromLocationResult,
  isPinnedLocationFallback,
  PINNED_LOCATION_FALLBACK_ADDRESS,
} from "@/modules/locations/location-address";
import type { LocationSearchResult } from "@/modules/locations/types";
import { useLocale } from "@/shared/i18n";
import { isOutsideCambodiaDeliveryHours } from "@/shared/time/cambodia-delivery-hours";
import { FieldLabel } from "@/ui/components/field-label";

type SavedAddress = {
  id: string;
  label: string;
  formattedShort: string;
  isDefault: boolean;
};

type CheckoutFulfillmentFieldsProps = {
  fulfillmentMethod: "delivery" | "pickup";
  onFulfillmentMethodChange: (method: "delivery" | "pickup") => void;
  pickupLocations: { id: string; name: string; address: string; instructions?: string | null }[];
  defaultPickupLocationKey?: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryNotes?: string | null;
  savedAddresses?: SavedAddress[];
  defaultAddressId?: string | null;
  isAuthenticated?: boolean;
};

const fieldClass =
  "h-11 w-full rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] px-3 text-sm outline-none focus:border-[color:var(--shop-primary)]";

export function CheckoutFulfillmentFields({
  fulfillmentMethod,
  onFulfillmentMethodChange,
  pickupLocations,
  defaultPickupLocationKey,
  deliveryEnabled,
  pickupEnabled,
  deliveryNotes,
  savedAddresses = [],
  defaultAddressId = null,
  isAuthenticated = false,
}: CheckoutFulfillmentFieldsProps) {
  const { t } = useLocale();
  const showDeliveryHoursNotice =
    fulfillmentMethod === "delivery" &&
    deliveryEnabled &&
    isOutsideCambodiaDeliveryHours();
  const methods = [
    ...(deliveryEnabled ? (["delivery"] as const) : []),
    ...(pickupEnabled ? (["pickup"] as const) : []),
  ];

  const hasSaved = savedAddresses.length > 0;
  const [addressMode, setAddressMode] = useState<"saved" | "new">(
    hasSaved ? "saved" : "new",
  );
  const [selectedAddressId, setSelectedAddressId] = useState(
    defaultAddressId ?? savedAddresses[0]?.id ?? "",
  );
  const [newAddress, setNewAddress] = useState({
    addressLine: "",
    addressLine2: "",
    cityOrArea: "",
    provinceOrState: "",
    postalCode: "",
    countryCode: "KH",
  });
  const [pin, setPin] = useState<LatLng | null>(null);
  const [pinConfirmed, setPinConfirmed] = useState(false);
  const [resolvingPin, setResolvingPin] = useState(false);

  function applyLocation(location: LocationSearchResult) {
    const fields = addressFieldsFromLocationResult(location);
    const nextPin = parseOptionalLatLng(location.latitude, location.longitude);
    setNewAddress((current) => ({
      ...current,
      addressLine: fields.addressLine,
      cityOrArea: fields.cityOrArea || current.cityOrArea,
      provinceOrState: fields.provinceOrState || current.provinceOrState,
      postalCode: fields.postalCode || current.postalCode,
      countryCode: fields.countryCode || current.countryCode,
    }));
    if (nextPin) {
      setPin(nextPin);
      setPinConfirmed(true);
    }
  }

  function applyTelegramPin(next: LatLng) {
    setPin(next);
    setPinConfirmed(false);
    // Do not overwrite a real address while the customer is still adjusting the pin.
    // Resolve text address only on confirm (or leave existing autocomplete text alone).
  }

  async function confirmPinnedLocation(next: LatLng) {
    setPin(next);
    setResolvingPin(true);
    try {
      const response = await fetch(
        `/api/location/reverse?lat=${encodeURIComponent(String(next.latitude))}&lng=${encodeURIComponent(String(next.longitude))}`,
      );
      if (response.ok) {
        const payload: unknown = await response.json();
        const result =
          typeof payload === "object" &&
          payload !== null &&
          "data" in payload &&
          typeof payload.data === "object" &&
          payload.data !== null &&
          "result" in payload.data
            ? (payload.data.result as LocationSearchResult | null)
            : null;
        if (result?.formattedAddress) {
          applyLocation({
            ...result,
            latitude: result.latitude ?? next.latitude,
            longitude: result.longitude ?? next.longitude,
          });
          setPinConfirmed(true);
          return;
        }
      }
    } catch {
      // Fall through to last-resort label — checkout must still work.
    } finally {
      setResolvingPin(false);
    }

    setNewAddress((current) => ({
      ...current,
      addressLine:
        current.addressLine.trim() && !isPinnedLocationFallback(current.addressLine)
          ? current.addressLine
          : PINNED_LOCATION_FALLBACK_ADDRESS,
      cityOrArea: current.cityOrArea.trim() ? current.cityOrArea : "Phnom Penh",
    }));
    setPinConfirmed(true);
  }

  return (
    <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
      <h2 className="text-sm font-semibold">{t("fulfillmentMethod")}</h2>

      {methods.length > 1 ? (
        <div className="grid grid-cols-2 gap-2">
          {methods.map((method) => (
            <label
              key={method}
              className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-sm font-medium capitalize ${
                fulfillmentMethod === method
                  ? "border-[color:var(--shop-primary)] bg-[color:var(--shop-primary)]/20 text-[color:var(--shop-ink)]"
                  : "border-[color:var(--shop-line)]"
              }`}
            >
              <input
                type="radio"
                name="fulfillmentMethod"
                value={method}
                checked={fulfillmentMethod === method}
                onChange={() => onFulfillmentMethodChange(method)}
                className="sr-only"
              />
              {method === "delivery" ? t("delivery") : t("pickup")}
            </label>
          ))}
        </div>
      ) : (
        <input type="hidden" name="fulfillmentMethod" value={methods[0] ?? "delivery"} />
      )}

      {fulfillmentMethod === "delivery" && deliveryEnabled ? (
        <div className="space-y-3">
          {showDeliveryHoursNotice ? (
            <div
              role="status"
              className="rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface)] px-3 py-3 text-sm text-[color:var(--shop-ink)]"
            >
              <p className="font-medium">{t("deliveryHoursNoticeTitle")}</p>
              <p className="mt-1 text-[color:var(--shop-ink-muted)] leading-relaxed">
                {t("deliveryHoursNoticeBody")}
              </p>
            </div>
          ) : null}

          {deliveryNotes ? (
            <p className="text-xs text-[color:var(--shop-ink-muted)]">{deliveryNotes}</p>
          ) : null}

          {hasSaved ? (
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  addressMode === "saved"
                    ? "border-[color:var(--shop-primary)] bg-[color:var(--shop-primary)]/15 text-[color:var(--shop-ink)]"
                    : "border-[color:var(--shop-line)]"
                }`}
                onClick={() => setAddressMode("saved")}
              >
                {t("savedAddress")}
              </button>
              <button
                type="button"
                className={`rounded-xl border px-3 py-2 text-sm font-medium ${
                  addressMode === "new"
                    ? "border-[color:var(--shop-primary)] bg-[color:var(--shop-primary)]/15 text-[color:var(--shop-ink)]"
                    : "border-[color:var(--shop-line)]"
                }`}
                onClick={() => setAddressMode("new")}
              >
                {t("newAddress")}
              </button>
            </div>
          ) : null}

          <input type="hidden" name="addressMode" value={hasSaved ? addressMode : "new"} />

          {hasSaved && addressMode === "saved" ? (
            <div className="space-y-2">
              <FieldLabel htmlFor="savedAddressId" required>
                {t("chooseAddress")}
              </FieldLabel>
              <select
                id="savedAddressId"
                name="savedAddressId"
                required
                aria-required="true"
                value={selectedAddressId}
                onChange={(e) => setSelectedAddressId(e.target.value)}
                className={fieldClass}
              >
                {savedAddresses.map((address) => (
                  <option key={address.id} value={address.id}>
                    {address.label}
                    {address.isDefault ? ` ${t("defaultSuffix")}` : ""} — {address.formattedShort}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <FieldLabel htmlFor="addressLine" required>
                  {t("deliveryLocation")}
                </FieldLabel>
                <LocationAutocomplete
                  id="addressLine"
                  name="addressLine"
                  value={newAddress.addressLine}
                  onChange={(event) =>
                    setNewAddress((current) => ({
                      ...current,
                      addressLine: event.target.value,
                    }))
                  }
                  onLocationSelect={applyLocation}
                  required={addressMode === "new" || !hasSaved}
                  aria-required={addressMode === "new" || !hasSaved}
                  className={fieldClass}
                  placeholder={t("locationSearchPlaceholder")}
                />
              </div>
              <DeliveryLocationPicker
                latitude={pin?.latitude ?? null}
                longitude={pin?.longitude ?? null}
                confirmed={pinConfirmed}
                onDraftChange={applyTelegramPin}
                onConfirm={(next) => {
                  void confirmPinnedLocation(next);
                }}
              />
              {resolvingPin ? (
                <p role="status" className="text-xs text-[color:var(--shop-ink-muted)]">
                  {t("resolvingPinnedAddress")}
                </p>
              ) : null}
              {pinConfirmed && pin ? (
                <>
                  <input type="hidden" name="deliveryLatitude" value={String(pin.latitude)} />
                  <input type="hidden" name="deliveryLongitude" value={String(pin.longitude)} />
                </>
              ) : null}
              <div>
<FieldLabel htmlFor="addressLine2">{t("addressLine2Optional")}</FieldLabel>
                <input
                  id="addressLine2"
                  name="addressLine2"
                  value={newAddress.addressLine2}
                  onChange={(event) =>
                    setNewAddress((current) => ({
                      ...current,
                      addressLine2: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </div>
              <div>
                <FieldLabel htmlFor="cityOrArea" required>
                  {t("cityOrArea")}
                </FieldLabel>
                <input
                  id="cityOrArea"
                  name="cityOrArea"
                  required={addressMode === "new" || !hasSaved}
                  aria-required={addressMode === "new" || !hasSaved}
                  value={newAddress.cityOrArea}
                  onChange={(event) =>
                    setNewAddress((current) => ({
                      ...current,
                      cityOrArea: event.target.value,
                    }))
                  }
                  className={fieldClass}
                  placeholder="Phnom Penh, Toul Kork, etc."
                />
              </div>
              <div>
<FieldLabel htmlFor="provinceOrState">{t("provinceOptional")}</FieldLabel>
                <input
                  id="provinceOrState"
                  name="provinceOrState"
                  value={newAddress.provinceOrState}
                  onChange={(event) =>
                    setNewAddress((current) => ({
                      ...current,
                      provinceOrState: event.target.value,
                    }))
                  }
                  className={fieldClass}
                />
              </div>
              <div>
<FieldLabel htmlFor="deliveryInstructions">{t("deliveryInstructions")}</FieldLabel>
                <textarea
                  id="deliveryInstructions"
                  name="deliveryInstructions"
                  rows={3}
                  className={`${fieldClass} h-auto py-2`}
                  placeholder="Gate code, preferred time, etc."
                />
              </div>
              {isAuthenticated ? (
                <div className="space-y-2">
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="saveAddress" value="true" />
                    {t("saveAddressNextTime")}
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="setAddressAsDefault" value="true" />
                    {t("setAsDefault")}
                  </label>
                  <input type="hidden" name="addressLabel" value="Home" />
                </div>
              ) : null}
              <input type="hidden" name="countryCode" value={newAddress.countryCode} />
              <input type="hidden" name="postalCode" value={newAddress.postalCode} />
            </>
          )}
        </div>
      ) : null}

      {fulfillmentMethod === "pickup" && pickupEnabled ? (
        <div>
          <FieldLabel htmlFor="pickupLocationKey" required>
            {t("pickupLocation")}
          </FieldLabel>
          <select
            id="pickupLocationKey"
            name="pickupLocationKey"
            required
            aria-required="true"
            defaultValue={defaultPickupLocationKey ?? pickupLocations[0]?.id ?? ""}
            className={fieldClass}
          >
            {pickupLocations.map((location) => (
              <option key={location.id} value={location.id}>
                {location.name} — {location.address}
              </option>
            ))}
          </select>
        </div>
      ) : null}
    </div>
  );
}
