"use client";

import { useState } from "react";

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
              <label htmlFor="savedAddressId" className="mb-1 block text-xs font-medium">
                Choose address
              </label>
              <select
                id="savedAddressId"
                name="savedAddressId"
                required
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
                <label htmlFor="addressLine" className="mb-1 block text-xs font-medium">
                  Address
                </label>
                <input
                  id="addressLine"
                  name="addressLine"
                  required={addressMode === "new" || !hasSaved}
                  className={fieldClass}
                  placeholder="Street, house number, landmark"
                />
              </div>
              <div>
                <label htmlFor="addressLine2" className="mb-1 block text-xs font-medium">
                  Address line 2{" "}
                  <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
                </label>
                <input id="addressLine2" name="addressLine2" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="cityOrArea" className="mb-1 block text-xs font-medium">
                  City or area
                </label>
                <input
                  id="cityOrArea"
                  name="cityOrArea"
                  required={addressMode === "new" || !hasSaved}
                  className={fieldClass}
                  placeholder="Phnom Penh, Toul Kork, etc."
                />
              </div>
              <div>
                <label htmlFor="provinceOrState" className="mb-1 block text-xs font-medium">
                  Province / state{" "}
                  <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
                </label>
                <input id="provinceOrState" name="provinceOrState" className={fieldClass} />
              </div>
              <div>
                <label htmlFor="deliveryInstructions" className="mb-1 block text-xs font-medium">
                  Delivery instructions{" "}
                  <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
                </label>
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
                  <input type="hidden" name="countryCode" value="KH" />
                </div>
              ) : null}
            </>
          )}
        </div>
      ) : null}

      {fulfillmentMethod === "pickup" && pickupEnabled ? (
        <div>
          <label htmlFor="pickupLocationKey" className="mb-1 block text-xs font-medium">
            Pickup location
          </label>
          <select
            id="pickupLocationKey"
            name="pickupLocationKey"
            required
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
