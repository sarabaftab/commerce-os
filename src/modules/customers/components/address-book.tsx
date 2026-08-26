"use client";

import { useActionState, useState } from "react";

import { FieldLabel } from "@/ui/components/field-label";

import {
  createAddressAction,
  deleteAddressAction,
  setDefaultAddressAction,
  updateAddressAction,
  type CustomerActionState,
} from "../actions/account-actions";
import { ADDRESS_LABEL_SUGGESTIONS } from "../schemas/profile";
import type { CustomerAddressDto } from "../types";

const fieldClass =
  "h-11 w-full rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] px-3 text-sm outline-none focus:border-[color:var(--shop-primary)]";

const initialState: CustomerActionState = {};

function AddressFields({
  address,
  fieldErrors,
}: {
  address?: CustomerAddressDto;
  fieldErrors?: Record<string, string>;
}) {
  return (
    <div className="space-y-3">
      <div>
        <FieldLabel htmlFor="label" required>
          Label
        </FieldLabel>
        <input
          id="label"
          name="label"
          list="address-labels"
          required
          aria-required="true"
          defaultValue={address?.label ?? "Home"}
          className={fieldClass}
        />
        <datalist id="address-labels">
          {ADDRESS_LABEL_SUGGESTIONS.map((label) => (
            <option key={label} value={label} />
          ))}
        </datalist>
        {fieldErrors?.label ? (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.label}</p>
        ) : null}
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="recipientFirstName" required>
            Recipient first name
          </FieldLabel>
          <input
            id="recipientFirstName"
            name="recipientFirstName"
            required
            aria-required="true"
            defaultValue={address?.recipientFirstName ?? ""}
            className={fieldClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor="recipientLastName" required>
            Recipient last name
          </FieldLabel>
          <input
            id="recipientLastName"
            name="recipientLastName"
            required
            aria-required="true"
            defaultValue={address?.recipientLastName ?? ""}
            className={fieldClass}
          />
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="phone" required>
          Phone
        </FieldLabel>
        <input
          id="phone"
          name="phone"
          type="tel"
          required
          aria-required="true"
          defaultValue={address?.phone ?? ""}
          className={fieldClass}
        />
        {fieldErrors?.phone ? (
          <p className="mt-1 text-xs text-destructive">{fieldErrors.phone}</p>
        ) : null}
      </div>
      <div>
        <FieldLabel htmlFor="addressLine1" required>
          Address line 1
        </FieldLabel>
        <input
          id="addressLine1"
          name="addressLine1"
          required
          aria-required="true"
          defaultValue={address?.addressLine1 ?? ""}
          className={fieldClass}
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
          defaultValue={address?.addressLine2 ?? ""}
          className={fieldClass}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="cityOrDistrict" required>
            City / district
          </FieldLabel>
          <input
            id="cityOrDistrict"
            name="cityOrDistrict"
            required
            aria-required="true"
            defaultValue={address?.cityOrDistrict ?? ""}
            className={fieldClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor="provinceOrState" required>
            Province / state
          </FieldLabel>
          <input
            id="provinceOrState"
            name="provinceOrState"
            required
            aria-required="true"
            defaultValue={address?.provinceOrState ?? ""}
            className={fieldClass}
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="postalCode">
            Postal code{" "}
            <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
          </FieldLabel>
          <input
            id="postalCode"
            name="postalCode"
            defaultValue={address?.postalCode ?? ""}
            className={fieldClass}
          />
        </div>
        <div>
          <FieldLabel htmlFor="countryCode" required>
            Country
          </FieldLabel>
          <input
            id="countryCode"
            name="countryCode"
            required
            aria-required="true"
            defaultValue={address?.countryCode ?? "KH"}
            className={fieldClass}
            maxLength={2}
          />
        </div>
      </div>
      <div>
        <FieldLabel htmlFor="deliveryInstructions">
          Delivery instructions{" "}
          <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
        </FieldLabel>
        <textarea
          id="deliveryInstructions"
          name="deliveryInstructions"
          rows={2}
          defaultValue={address?.deliveryInstructions ?? ""}
          className="w-full rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] px-3 py-2 text-sm outline-none focus:border-[color:var(--shop-primary)]"
        />
      </div>
      <label className="flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="isDefault"
          value="true"
          defaultChecked={address?.isDefault ?? false}
        />
        Set as default address
      </label>
    </div>
  );
}

type AddressBookProps = {
  tenantSlug: string;
  addresses: CustomerAddressDto[];
};

export function AddressBook({ tenantSlug, addresses }: AddressBookProps) {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [showNew, setShowNew] = useState(addresses.length === 0);
  const [createState, createAction, createPending] = useActionState(
    createAddressAction.bind(null, tenantSlug),
    initialState,
  );

  return (
    <div className="space-y-4">
      {addresses.length === 0 && !showNew ? (
        <p className="text-sm text-[color:var(--shop-ink-muted)]">
          No saved addresses yet.
        </p>
      ) : null}

      <ul className="space-y-3">
        {addresses.map((address) => (
          <li
            key={address.id}
            className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            {editingId === address.id ? (
              <EditAddressForm
                tenantSlug={tenantSlug}
                address={address}
                onDone={() => setEditingId(null)}
              />
            ) : (
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold">
                      {address.label}
                      {address.isDefault ? (
                        <span className="ml-2 rounded-full bg-[color:var(--shop-primary)]/30 px-2 py-0.5 text-[11px] font-medium text-[color:var(--shop-ink)]">
                          Default
                        </span>
                      ) : null}
                    </p>
                    <p className="mt-1 text-sm">
                      {address.recipientFirstName} {address.recipientLastName}
                    </p>
                    <p className="text-sm text-[color:var(--shop-ink-muted)]">
                      {address.formattedShort}
                    </p>
                  </div>
                </div>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-[color:var(--shop-line)]"
                    onClick={() => setEditingId(address.id)}
                  >
                    Edit
                  </button>
                  {!address.isDefault ? (
                    <button
                      type="button"
                      className="rounded-full px-3 py-1.5 text-xs font-medium ring-1 ring-[color:var(--shop-line)]"
                      onClick={() => setDefaultAddressAction(tenantSlug, address.id)}
                    >
                      Set as default
                    </button>
                  ) : null}
                  <button
                    type="button"
                    className="rounded-full px-3 py-1.5 text-xs font-medium text-destructive ring-1 ring-destructive/30"
                    onClick={() => {
                      if (
                        window.confirm(
                          `Remove ${address.label}? You can add it again later.`,
                        )
                      ) {
                        void deleteAddressAction(tenantSlug, address.id);
                      }
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            )}
          </li>
        ))}
      </ul>

      {showNew ? (
        <form
          action={createAction}
          className="space-y-4 rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
        >
          <h2 className="text-sm font-semibold">New address</h2>
          {createState.error ? (
            <p role="alert" className="text-sm text-destructive">
              {createState.error}
            </p>
          ) : null}
          {createState.success ? (
            <p role="status" className="text-sm text-emerald-700">
              {createState.success}
            </p>
          ) : null}
          <AddressFields fieldErrors={createState.fieldErrors} />
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={createPending}
              className="h-11 flex-1 rounded-xl bg-[color:var(--shop-primary)] text-sm font-semibold text-[color:var(--shop-on-primary)] disabled:opacity-60"
            >
              {createPending ? "Saving…" : "Save address"}
            </button>
            {addresses.length > 0 ? (
              <button
                type="button"
                className="h-11 rounded-xl px-4 text-sm ring-1 ring-[color:var(--shop-line)]"
                onClick={() => setShowNew(false)}
              >
                Cancel
              </button>
            ) : null}
          </div>
        </form>
      ) : (
        <button
          type="button"
          onClick={() => setShowNew(true)}
          className="h-11 w-full rounded-xl text-sm font-semibold ring-1 ring-[color:var(--shop-line)]"
        >
          Add address
        </button>
      )}
    </div>
  );
}

function EditAddressForm({
  tenantSlug,
  address,
  onDone,
}: {
  tenantSlug: string;
  address: CustomerAddressDto;
  onDone: () => void;
}) {
  const [state, formAction, pending] = useActionState(
    updateAddressAction.bind(null, tenantSlug, address.id),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4">
      {state.error ? (
        <p role="alert" className="text-sm text-destructive">
          {state.error}
        </p>
      ) : null}
      {state.success ? (
        <p role="status" className="text-sm text-emerald-700">
          {state.success}
        </p>
      ) : null}
      <AddressFields address={address} fieldErrors={state.fieldErrors} />
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={pending}
          className="h-11 flex-1 rounded-xl bg-[color:var(--shop-primary)] text-sm font-semibold text-[color:var(--shop-on-primary)] disabled:opacity-60"
        >
          {pending ? "Saving…" : "Update"}
        </button>
        <button
          type="button"
          onClick={onDone}
          className="h-11 rounded-xl px-4 text-sm ring-1 ring-[color:var(--shop-line)]"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
