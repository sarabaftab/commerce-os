"use client";

import { LOCALES, type Locale } from "./locale";
import { useLocale } from "./locale-context";

const LABELS: Record<Locale, string> = {
  en: "EN",
  km: "KM",
  zh: "中文",
};

export function LanguageSwitcher({ className }: { className?: string }) {
  const { locale, setLocale } = useLocale();

  return (
    <div
      className={
        className ??
        "inline-flex items-center gap-0.5 rounded-full bg-[color:var(--shop-surface)]/80 p-0.5 text-[11px] font-semibold tracking-wide"
      }
      role="group"
      aria-label="Language"
    >
      {LOCALES.map((code) => {
        const active = locale === code;
        return (
          <button
            key={code}
            type="button"
            aria-pressed={active}
            onClick={() => setLocale(code)}
            className={
              active
                ? "rounded-full bg-[color:var(--shop-primary)] px-2 py-1 text-[color:var(--shop-on-primary)]"
                : "rounded-full px-2 py-1 text-[color:var(--shop-ink-muted)] transition hover:text-[color:var(--shop-ink)]"
            }
          >
            {LABELS[code]}
          </button>
        );
      })}
    </div>
  );
}
