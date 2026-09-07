"use client";

import { useActionState, useEffect, useState } from "react";

import {
  publishBroadcastAction,
  type PublishBroadcastActionState,
} from "@/modules/broadcasts/actions/broadcast-actions";
import { TELEGRAM_MESSAGE_MAX_LENGTH } from "@/modules/broadcasts/schemas/broadcast";
import { Button } from "@/ui/components/ui/button";
import { Label } from "@/ui/components/ui/label";
import { Textarea } from "@/ui/components/ui/textarea";
import { Input } from "@/ui/components/ui/input";

type BroadcastFormProps = {
  channel: string;
  defaultStoreUrl: string;
};

const initial: PublishBroadcastActionState = {};

export function BroadcastForm({ channel, defaultStoreUrl }: BroadcastFormProps) {
  const [state, action, pending] = useActionState(publishBroadcastAction, initial);
  const [message, setMessage] = useState("");
  const [buttonLabel, setButtonLabel] = useState("Shop Now");
  const [buttonDestination, setButtonDestination] = useState("");
  const [formKey, setFormKey] = useState(0);

  useEffect(() => {
    if (state.success) {
      setMessage("");
      setButtonLabel("Shop Now");
      setButtonDestination("");
      setFormKey((value) => value + 1);
    }
  }, [state.success]);

  const previewLabel = buttonLabel.trim();

  return (
    <div className="grid gap-6 lg:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
      <form
        key={formKey}
        action={action}
        className="space-y-4 rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] p-5 shadow-[var(--admin-shadow)]"
        onSubmit={(event) => {
          if (pending) {
            event.preventDefault();
            return;
          }
          const confirmed = window.confirm(
            `Publish this message to ${channel}?`,
          );
          if (!confirmed) {
            event.preventDefault();
          }
        }}
      >
        <p className="text-sm text-[color:var(--admin-ink-muted)]">
          Publishing to: <span className="font-medium text-[color:var(--admin-ink)]">{channel}</span>
        </p>

        <div className="space-y-1.5">
          <Label htmlFor="message">Message</Label>
          <Textarea
            id="message"
            name="message"
            required
            rows={8}
            maxLength={TELEGRAM_MESSAGE_MAX_LENGTH}
            value={message}
            onChange={(event) => setMessage(event.target.value)}
            placeholder="Write your announcement…"
            className="min-h-40 resize-y"
          />
          <p className="text-xs text-[color:var(--admin-ink-muted)]">
            {message.length}/{TELEGRAM_MESSAGE_MAX_LENGTH} characters · plain text
          </p>
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="buttonLabel">CTA button label (optional)</Label>
          <Input
            id="buttonLabel"
            name="buttonLabel"
            value={buttonLabel}
            onChange={(event) => setButtonLabel(event.target.value)}
            maxLength={64}
            placeholder="Shop Now"
          />
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="buttonDestination">CTA destination (optional)</Label>
          <Input
            id="buttonDestination"
            name="buttonDestination"
            value={buttonDestination}
            onChange={(event) => setButtonDestination(event.target.value)}
            placeholder="Leave blank for store home, or /products / https://…"
          />
          <p className="text-xs text-[color:var(--admin-ink-muted)]">
            Blank uses the storefront Mini App URL ({defaultStoreUrl}). Relative paths and HTTPS URLs
            are supported.
          </p>
        </div>

        {state.error ? (
          <p role="alert" className="rounded-xl bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {state.error}
          </p>
        ) : null}

        {state.success ? (
          <p role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            Broadcast published successfully to {state.channel ?? channel}.
          </p>
        ) : null}

        <Button type="submit" disabled={pending || !message.trim()} className="rounded-full">
          {pending ? "Publishing…" : state.success ? "Publish Another" : "Publish to Telegram"}
        </Button>
      </form>

      <aside className="space-y-3 rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface)]/60 p-5">
        <h2 className="font-[family-name:var(--font-admin-display)] text-lg tracking-tight">
          Telegram Preview
        </h2>
        <div className="space-y-3 rounded-xl bg-[color:var(--admin-surface-elevated)] p-4 shadow-sm">
          <p className="whitespace-pre-wrap text-sm leading-relaxed text-[color:var(--admin-ink)]">
            {message.trim() || "Your message will appear here."}
          </p>
          {previewLabel ? (
            <div className="rounded-lg border border-[color:var(--admin-line)] px-3 py-2 text-center text-sm font-medium text-[color:var(--admin-ink)]">
              {previewLabel}
            </div>
          ) : null}
        </div>
        <p className="text-xs text-[color:var(--admin-ink-muted)]">
          Preview is approximate. Channel posts use a URL button that opens CommerceOS in Telegram or
          the browser.
        </p>
      </aside>
    </div>
  );
}
