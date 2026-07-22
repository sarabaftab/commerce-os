"use client";

type CheckoutFulfillmentFieldsProps = {
  fulfillmentMethod: "delivery" | "pickup";
  onFulfillmentMethodChange: (method: "delivery" | "pickup") => void;
  pickupLocations: { id: string; name: string; address: string; instructions?: string | null }[];
  defaultPickupLocationKey?: string;
  deliveryEnabled: boolean;
  pickupEnabled: boolean;
  deliveryNotes?: string | null;
};

const fieldClass =
  "h-11 w-full rounded-xl border border-[color:var(--shop-line)] bg-white px-3 text-sm outline-none focus:border-[color:var(--shop-accent)]";

export function CheckoutFulfillmentFields({
  fulfillmentMethod,
  onFulfillmentMethodChange,
  pickupLocations,
  defaultPickupLocationKey,
  deliveryEnabled,
  pickupEnabled,
  deliveryNotes,
}: CheckoutFulfillmentFieldsProps) {
  const methods = [
    ...(deliveryEnabled ? (["delivery"] as const) : []),
    ...(pickupEnabled ? (["pickup"] as const) : []),
  ];

  return (
    <div className="space-y-4 rounded-2xl bg-white/80 p-4 ring-1 ring-[color:var(--shop-line)]">
      <h2 className="text-sm font-semibold">Fulfillment</h2>

      {methods.length > 1 ? (
        <div className="grid grid-cols-2 gap-2">
          {methods.map((method) => (
            <label
              key={method}
              className={`flex cursor-pointer items-center justify-center rounded-xl border px-3 py-3 text-sm font-medium capitalize ${
                fulfillmentMethod === method
                  ? "border-[color:var(--shop-accent)] bg-[color:var(--shop-accent)]/10 text-[color:var(--shop-accent)]"
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
          <div>
            <label htmlFor="addressLine" className="mb-1 block text-xs font-medium">
              Address
            </label>
            <input
              id="addressLine"
              name="addressLine"
              required
              className={fieldClass}
              placeholder="Street, house number, landmark"
            />
          </div>
          <div>
            <label htmlFor="cityOrArea" className="mb-1 block text-xs font-medium">
              City or area
            </label>
            <input
              id="cityOrArea"
              name="cityOrArea"
              required
              className={fieldClass}
              placeholder="Phnom Penh, Toul Kork, etc."
            />
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
