"use client";

import { useTelegramHaptics } from "@/channels/telegram/client/telegram-provider";
import {
  openTelegramHttpsLink,
  telegramSupportChatUrl,
} from "@/channels/telegram/support-link";
import { shop } from "@/ui/storefront/shop-classes";

type FaqSupportFallbackProps = {
  telegramSupportUsername: string | null;
};

export function FaqSupportFallback({ telegramSupportUsername }: FaqSupportFallbackProps) {
  const haptic = useTelegramHaptics();
  const url = telegramSupportChatUrl(telegramSupportUsername);
  if (!url) {
    return null;
  }

  return (
    <section className="rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]">
      <h2 className="text-sm font-semibold text-[color:var(--shop-ink)]">Still need help?</h2>
      <p className="mt-1 text-sm leading-relaxed text-[color:var(--shop-ink-muted)]">
        Can&apos;t find the answer you&apos;re looking for? Chat with our team on Telegram.
      </p>
      <a
        href={url}
        rel="noopener noreferrer"
        className={`${shop.btnPrimaryBlock} mt-4`}
        onClick={(event) => {
          event.preventDefault();
          haptic("light");
          openTelegramHttpsLink(url);
        }}
      >
        Contact Our Team
      </a>
    </section>
  );
}
