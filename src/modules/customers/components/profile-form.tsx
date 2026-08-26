"use client";

import { useActionState } from "react";

import { FieldLabel } from "@/ui/components/field-label";
import { ProductImage } from "@/ui/storefront/product-image";

import {
  updateProfileAction,
  type CustomerActionState,
} from "../actions/account-actions";
import type { CustomerProfileDto } from "../types";

const fieldClass =
  "h-11 w-full rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] px-3 text-sm outline-none focus:border-[color:var(--shop-primary)]";

const initialState: CustomerActionState = {};

type ProfileFormProps = {
  tenantSlug: string;
  profile: CustomerProfileDto;
};

export function ProfileForm({ tenantSlug, profile }: ProfileFormProps) {
  const [state, formAction, pending] = useActionState(
    updateProfileAction.bind(null, tenantSlug),
    initialState,
  );

  return (
    <form action={formAction} className="space-y-4" noValidate>
      {profile.photoUrl ? (
        <div className="relative h-16 w-16 overflow-hidden rounded-full ring-1 ring-[color:var(--shop-line)]">
          <ProductImage
            src={profile.photoUrl}
            alt=""
            sizes="64px"
            className="h-full w-full"
          />
        </div>
      ) : null}

      {state.success ? (
        <p role="status" className="rounded-xl bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
          {state.success}
        </p>
      ) : null}
      {state.error ? (
        <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {state.error}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2">
        <div>
          <FieldLabel htmlFor="firstName" required>
            First name
          </FieldLabel>
          <input
            id="firstName"
            name="firstName"
            required
            aria-required="true"
            defaultValue={profile.firstName ?? ""}
            className={fieldClass}
            aria-invalid={Boolean(state.fieldErrors?.firstName)}
            aria-describedby={state.fieldErrors?.firstName ? "firstName-error" : undefined}
          />
          {state.fieldErrors?.firstName ? (
            <p id="firstName-error" className="mt-1 text-xs text-destructive">
              {state.fieldErrors.firstName}
            </p>
          ) : null}
        </div>
        <div>
          <FieldLabel htmlFor="lastName" required>
            Last name
          </FieldLabel>
          <input
            id="lastName"
            name="lastName"
            required
            aria-required="true"
            defaultValue={profile.lastName ?? ""}
            className={fieldClass}
            aria-invalid={Boolean(state.fieldErrors?.lastName)}
          />
          {state.fieldErrors?.lastName ? (
            <p className="mt-1 text-xs text-destructive">{state.fieldErrors.lastName}</p>
          ) : null}
        </div>
      </div>

      <div>
        <FieldLabel htmlFor="displayName">
          Display name{" "}
          <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
        </FieldLabel>
        <input
          id="displayName"
          name="displayName"
          defaultValue={profile.displayName ?? ""}
          className={fieldClass}
        />
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
          defaultValue={profile.phone ?? ""}
          className={fieldClass}
          aria-invalid={Boolean(state.fieldErrors?.phone)}
        />
        {state.fieldErrors?.phone ? (
          <p className="mt-1 text-xs text-destructive">{state.fieldErrors.phone}</p>
        ) : null}
      </div>

      <div>
        <FieldLabel htmlFor="email">
          Email{" "}
          <span className="font-normal text-[color:var(--shop-ink-muted)]">(optional)</span>
        </FieldLabel>
        <input
          id="email"
          name="email"
          type="email"
          defaultValue={profile.email ?? ""}
          className={fieldClass}
          aria-invalid={Boolean(state.fieldErrors?.email)}
        />
        {state.fieldErrors?.email ? (
          <p className="mt-1 text-xs text-destructive">{state.fieldErrors.email}</p>
        ) : null}
      </div>

      <button
        type="submit"
        disabled={pending}
        className="h-11 w-full rounded-xl bg-[color:var(--shop-primary)] text-sm font-semibold text-[color:var(--shop-on-primary)] disabled:opacity-60"
      >
        {pending ? "Saving…" : "Save profile"}
      </button>
    </form>
  );
}
