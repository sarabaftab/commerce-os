"use client";

import { useState } from "react";

import { LocationAutocomplete } from "@/modules/locations/components/location-autocomplete";
import type { LocationSearchResult } from "@/modules/locations/types";
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

  function applyLocation(location: LocationSearchResult) {
    const addressLine = [location.houseNumber, location.street].filter(Boolean).join(" ");
    const cityOrArea = [location.district, location.city].filter(Boolean).join(" / ");
    setNewAddress((current) => ({
      ...current,
      addressLine: addressLine || location.formattedAddress,
      cityOrArea: cityOrArea || current.cityOrArea,
      provinceOrState: location.province || current.provinceOrState,
      postalCode: location.postalCode || current.postalCode,
      countryCode: location.countryCode || current.countryCode,
    }));
  }

  return (
    <div className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
      <h2 className="text-sm font-semibold">Fulfillment</h2>

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
              {method}
            </label>
          ))}
        </div>
      ) : (
        <input type="hidden" name="fulfillmentMethod" value={methods[0] ?? "delivery"} />
      )}

      {fulfillmentMethod === "delivery" && deliveryEnabled ? (
        <div className="space-y-3">
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
                Saved address
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
                New address
              </button>
            </div>
          ) : null}

          <input type="hidden" name="addressMode" value={hasSaved ? addressMode : "new"} />

          {hasSaved && addressMode === "saved" ? (
            <div className="space-y-2">
              <FieldLabel htmlFor="savedAddressId" required>
                Choose address
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
                    {address.isDefault ? " (Default)" : ""} — {address.formattedShort}
                  </option>
                ))}
              </select>
            </div>
          ) : (
            <>
              <div>
                <FieldLabel htmlFor="addressLine" required>
                  Delivery address
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
                  placeholder="Start typing your address…"
                />
              </div>
              <div>
                <FieldLabel htmlFor="addressLine2">
                  Address line 2{" "}
                  <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
                </FieldLabel>
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
                  City or area
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
                <FieldLabel htmlFor="provinceOrState">
                  Province / state{" "}
                  <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
                </FieldLabel>
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
                <FieldLabel htmlFor="deliveryInstructions">
                  Delivery instructions{" "}
                  <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
                </FieldLabel>
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
                    Save this address for next time
                  </label>
                  <label className="flex items-center gap-2 text-sm">
                    <input type="checkbox" name="setAddressAsDefault" value="true" />
                    Set as default
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
            Pickup location
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
