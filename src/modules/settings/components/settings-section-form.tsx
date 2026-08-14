"use client";

import { useActionState } from "react";

import {
  saveBrandingSettingsAction,
  saveDeliverySettingsAction,
  saveGeneralSettingsAction,
  savePaymentSettingsAction,
  savePickupLocationAction,
  deletePickupLocationAction,
  type SettingsActionState,
} from "@/modules/settings/actions/settings-actions";
import type { TenantSettingsBundle } from "@/modules/settings";
import { fromMinor } from "@/shared/money/money";
import { Button } from "@/ui/components/ui/button";
import { Input } from "@/ui/components/ui/input";
import { Label } from "@/ui/components/ui/label";
import { Textarea } from "@/ui/components/ui/textarea";
import { useTransition } from "react";

const initial: SettingsActionState = {};

function Status({ state }: { state: SettingsActionState }) {
  if (state.error) {
    return <p className="text-sm text-destructive">{state.error}</p>;
  }
  if (state.success) {
    return <p className="text-sm text-emerald-700">Saved.</p>;
  }
  return null;
}

type Props = {
  bundle: TenantSettingsBundle;
  section: "general" | "fulfillment" | "payments" | "branding";
};

export function SettingsSectionForm({ bundle, section }: Props) {
  if (section === "general") {
    return <GeneralSection bundle={bundle} />;
  }
  if (section === "fulfillment") {
    return <FulfillmentSection bundle={bundle} />;
  }
  if (section === "payments") {
    return <PaymentsSection bundle={bundle} />;
  }
  return <BrandingSection bundle={bundle} />;
}

function GeneralSection({ bundle }: { bundle: TenantSettingsBundle }) {
  const s = bundle.settings;
  const [state, action, pending] = useActionState(saveGeneralSettingsAction, initial);
  return (
    <form action={action} className="max-w-xl space-y-4">
      <Field label="Display name" name="displayName" defaultValue={s.displayName ?? ""} />
      <Field label="Currency" name="currency" defaultValue={bundle.currency} />
      <Field label="Phone" name="phone" defaultValue={s.phone ?? ""} />
      <Field label="Email" name="email" defaultValue={s.email ?? ""} type="email" />
      <Field label="Address" name="address" defaultValue={s.address ?? ""} />
      <Field label="Timezone" name="timezone" defaultValue={s.timezone} />
      <div className="space-y-1.5">
        <Label htmlFor="businessHours">Business hours</Label>
        <Textarea
          id="businessHours"
          name="businessHours"
          rows={3}
          defaultValue={s.businessHours ?? ""}
        />
      </div>
      <Status state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save general settings"}
      </Button>
    </form>
  );
}

function PaymentsSection({ bundle }: { bundle: TenantSettingsBundle }) {
  const s = bundle.settings;
  const [state, action, pending] = useActionState(savePaymentSettingsAction, initial);
  return (
    <form action={action} className="max-w-xl space-y-4">
      <Checkbox name="codEnabled" label="Enable Cash on Delivery" defaultChecked={s.codEnabled} />
      <Checkbox name="abaEnabled" label="Enable ABA Transfer" defaultChecked={s.abaEnabled} />
      <Field label="ABA account name" name="abaAccountName" defaultValue={s.abaAccountName ?? ""} />
      <Field
        label="ABA account number"
        name="abaAccountNumber"
        defaultValue={s.abaAccountNumber ?? ""}
      />
      <div className="space-y-1.5">
        <Label htmlFor="abaInstructions">ABA instructions</Label>
        <Textarea
          id="abaInstructions"
          name="abaInstructions"
          rows={4}
          defaultValue={s.abaInstructions ?? ""}
        />
      </div>
      <Field
        label="ABA QR / payment image URL"
        name="abaQrImageUrl"
        defaultValue={s.abaQrImageUrl ?? ""}
      />
      <div className="space-y-1.5">
        <Label htmlFor="abaCustomerNote">Customer-facing payment note</Label>
        <Textarea
          id="abaCustomerNote"
          name="abaCustomerNote"
          rows={2}
          defaultValue={s.abaCustomerNote ?? ""}
        />
      </div>
      <Status state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save payment settings"}
      </Button>
    </form>
  );
}

function BrandingSection({ bundle }: { bundle: TenantSettingsBundle }) {
  const s = bundle.settings;
  const [state, action, pending] = useActionState(saveBrandingSettingsAction, initial);
  return (
    <form action={action} className="max-w-xl space-y-4">
      <Field label="Storefront display name" name="displayName" defaultValue={s.displayName ?? ""} />
      <Field label="Logo URL" name="logoUrl" defaultValue={s.logoUrl ?? ""} />
      <Field
        label="Primary brand color (#RRGGBB)"
        name="primaryColor"
        defaultValue={s.primaryColor ?? ""}
      />
      <Status state={state} />
      <Button type="submit" disabled={pending}>
        {pending ? "Saving…" : "Save branding"}
      </Button>
    </form>
  );
}

function FulfillmentSection({ bundle }: { bundle: TenantSettingsBundle }) {
  const s = bundle.settings;
  const [state, action, pending] = useActionState(saveDeliverySettingsAction, initial);
  const feeMajor = fromMinor(s.deliveryFeeMinor, bundle.currency);
  const thresholdMajor =
    s.freeDeliveryThresholdMinor != null
      ? String(fromMinor(s.freeDeliveryThresholdMinor, bundle.currency))
      : "";

  return (
    <div className="space-y-8">
      <form action={action} className="max-w-xl space-y-4">
        <Checkbox
          name="deliveryEnabled"
          label="Enable delivery"
          defaultChecked={s.deliveryEnabled}
        />
        <Checkbox name="pickupEnabled" label="Enable pickup" defaultChecked={s.pickupEnabled} />
        <Field
          label={`Delivery fee (${bundle.currency})`}
          name="deliveryFeeMajor"
          defaultValue={String(feeMajor)}
          type="number"
        />
        <Field
          label={`Free delivery threshold (${bundle.currency}, blank = none)`}
          name="freeDeliveryThresholdMajor"
          defaultValue={thresholdMajor}
          type="number"
        />
        <div className="space-y-1.5">
          <Label htmlFor="deliveryNotes">Delivery notes (customer-facing)</Label>
          <Textarea
            id="deliveryNotes"
            name="deliveryNotes"
            rows={3}
            defaultValue={s.deliveryNotes ?? ""}
          />
        </div>
        <Status state={state} />
        <Button type="submit" disabled={pending}>
          {pending ? "Saving…" : "Save delivery & pickup flags"}
        </Button>
      </form>

      <PickupLocationsEditor bundle={bundle} />
    </div>
  );
}

function PickupLocationsEditor({ bundle }: { bundle: TenantSettingsBundle }) {
  const [state, action, pending] = useActionState(savePickupLocationAction, initial);
  const [deleting, startDelete] = useTransition();

  return (
    <div className="space-y-4">
      <h3 className="text-sm font-semibold">Pickup locations</h3>
      <ul className="space-y-3">
        {bundle.pickupLocations.map((loc) => (
          <li key={loc.id} className="rounded-lg border p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-medium">
                  {loc.name}{" "}
                  <span className="text-muted-foreground">
                    {loc.isActive ? "(active)" : "(inactive)"}
                  </span>
                </p>
                <p className="text-muted-foreground">{loc.address}</p>
                {loc.instructions ? (
                  <p className="text-muted-foreground">{loc.instructions}</p>
                ) : null}
              </div>
              <Button
                type="button"
                variant="outline"
                size="sm"
                disabled={deleting}
                onClick={() => {
                  startDelete(async () => {
                    await deletePickupLocationAction(loc.id);
                  });
                }}
              >
                Delete
              </Button>
            </div>
            <details className="mt-2">
              <summary className="cursor-pointer text-xs text-muted-foreground">Edit</summary>
              <form action={action} className="mt-2 grid gap-2 md:grid-cols-2">
                <input type="hidden" name="id" value={loc.id} />
                <Field label="Name" name="name" defaultValue={loc.name} />
                <Field label="Address" name="address" defaultValue={loc.address} />
                <Field
                  label="Instructions"
                  name="instructions"
                  defaultValue={loc.instructions ?? ""}
                />
                <Field
                  label="Sort order"
                  name="sortOrder"
                  defaultValue={String(loc.sortOrder)}
                  type="number"
                />
                <Checkbox name="isActive" label="Active" defaultChecked={loc.isActive} />
                <Button type="submit" size="sm" disabled={pending}>
                  Update
                </Button>
              </form>
            </details>
          </li>
        ))}
      </ul>

      <form action={action} className="max-w-xl space-y-3 rounded-lg border p-4">
        <h4 className="text-sm font-medium">Add pickup location</h4>
        <Field label="Name" name="name" defaultValue="" />
        <Field label="Address" name="address" defaultValue="" />
        <Field label="Instructions" name="instructions" defaultValue="" />
        <Field label="Sort order" name="sortOrder" defaultValue="0" type="number" />
        <Checkbox name="isActive" label="Active" defaultChecked />
        <Status state={state} />
        <Button type="submit" disabled={pending}>
          Add location
        </Button>
      </form>
    </div>
  );
}

function Field({
  label,
  name,
  defaultValue,
  type = "text",
}: {
  label: string;
  name: string;
  defaultValue: string;
  type?: string;
}) {
  return (
    <div className="space-y-1.5">
      <Label htmlFor={name}>{label}</Label>
      <Input id={name} name={name} type={type} defaultValue={defaultValue} />
    </div>
  );
}

function Checkbox({
  name,
  label,
  defaultChecked,
}: {
  name: string;
  label: string;
  defaultChecked?: boolean;
}) {
  return (
    <label className="flex items-center gap-2 text-sm">
      <input
        type="checkbox"
        name={name}
        value="true"
        defaultChecked={defaultChecked}
        className="size-4 rounded border"
      />
      {label}
    </label>
  );
}
