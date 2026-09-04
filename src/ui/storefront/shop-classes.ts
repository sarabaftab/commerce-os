/**
 * Reusable storefront class fragments bound to `.shop-shell` CSS variables.
 * Prefer these over one-off color literals so the Billion palette stays consistent.
 */
export const shop = {
  btnPrimary:
    "inline-flex items-center justify-center rounded-full bg-[color:var(--shop-primary)] px-5 py-2.5 text-sm font-semibold text-[color:var(--shop-on-primary)] shadow-[var(--shop-shadow-sm)] transition hover:bg-[color:var(--shop-accent-soft)] active:scale-[0.98] disabled:opacity-70",
  btnPrimaryBlock:
    "flex h-12 w-full items-center justify-center rounded-full bg-[color:var(--shop-primary)] text-sm font-semibold text-[color:var(--shop-on-primary)] shadow-[var(--shop-shadow-sm)] transition hover:bg-[color:var(--shop-accent-soft)] active:scale-[0.98] disabled:opacity-70",
  btnSecondary:
    "inline-flex items-center justify-center rounded-full border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] px-5 py-2.5 text-sm font-semibold text-[color:var(--shop-ink)] transition hover:bg-[color:var(--shop-surface)]",
  chipActive:
    "bg-[color:var(--shop-primary)] text-[color:var(--shop-on-primary)] shadow-[var(--shop-shadow-sm)]",
  chipIdle:
    "bg-[color:var(--shop-surface-elevated)] text-[color:var(--shop-ink)] ring-1 ring-[color:var(--shop-line)]",
  badge:
    "rounded-full bg-[color:var(--shop-primary)] px-1 text-[10px] font-semibold text-[color:var(--shop-on-primary)]",
  card: "rounded-2xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] shadow-[var(--shop-shadow-sm)]",
  cardSoft:
    "rounded-2xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface)]/80 shadow-[var(--shop-shadow-sm)]",
  input:
    "w-full rounded-xl border border-[color:var(--shop-line)] bg-[color:var(--shop-surface-elevated)] px-3 py-2.5 text-sm text-[color:var(--shop-ink)] outline-none transition placeholder:text-[color:var(--shop-ink-muted)] focus:border-[color:var(--shop-primary)] focus:ring-2 focus:ring-[color:var(--shop-accent)]/50",
  linkAccent:
    "font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4 transition hover:text-[color:var(--shop-ink)]",
  navActive:
    "bg-[color:var(--shop-primary)] text-[color:var(--shop-on-primary)] shadow-[var(--shop-shadow-sm)]",
  navIdle:
    "text-[color:var(--shop-ink-muted)] hover:bg-[color:var(--shop-surface)] hover:text-[color:var(--shop-ink)]",
  /** Responsive content rail — phone → tablet → desktop Telegram/browser. */
  contentWidth:
    "mx-auto w-full max-w-lg px-4 sm:max-w-2xl md:max-w-3xl lg:max-w-5xl",
} as const;
