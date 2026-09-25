"use client";

import Link from "next/link";
import type { ReactNode } from "react";

import { localizedValue, useLocale, type MessageKey } from "@/shared/i18n";
import { shop } from "@/ui/storefront/shop-classes";

type LocalizedTextProps = {
  messageKey: MessageKey;
  as?: "span" | "p" | "h1" | "h2" | "h3" | "div";
  className?: string;
  prefix?: string;
  suffix?: string;
};

/** Always follows the live client locale (cookie/session) — safe on ISR pages. */
export function LocalizedText({
  messageKey,
  as: Tag = "span",
  className,
  prefix = "",
  suffix = "",
}: LocalizedTextProps) {
  const { t } = useLocale();
  return <Tag className={className}>{`${prefix}${t(messageKey)}${suffix}`}</Tag>;
}

export function LocalizedFaqHeading({ tenantName }: { tenantName: string }) {
  const { t } = useLocale();
  return (
    <div>
      <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
        {t("faqTitle")}
      </h1>
      <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
        {t("faqAnswersFor")} {tenantName}
      </p>
    </div>
  );
}

type HomeHeroProps = {
  brandName: string;
  productsHref: string;
};

export function LocalizedHomeHero({ brandName, productsHref }: HomeHeroProps) {
  const { t } = useLocale();
  return (
    <section className="relative overflow-hidden rounded-[1.75rem] bg-[color:var(--shop-ink)] px-5 py-8 text-[color:var(--shop-surface-elevated)]">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 opacity-50"
        style={{
          background:
            "radial-gradient(circle at 88% 12%, rgba(249,220,92,0.55), transparent 42%), linear-gradient(145deg, transparent 35%, rgba(250,229,136,0.25))",
        }}
      />
      <div className="relative space-y-4">
        <p className="text-[11px] font-medium tracking-[0.2em] text-[color:var(--shop-accent-soft)] uppercase">
          {brandName}
        </p>
        <h1 className="max-w-[16ch] whitespace-pre-line font-[family-name:var(--font-shop-display)] text-[2.2rem] leading-[1.08] tracking-tight">
          {t("heroTitle")}
        </h1>
        <p className="max-w-[42ch] text-sm leading-relaxed text-white/70">{t("heroBody")}</p>
        <Link href={productsHref} prefetch={false} className={shop.btnPrimary}>
          {t("shopProducts")}
        </Link>
      </div>
    </section>
  );
}

type LocalizedSectionHeaderProps = {
  titleKey: MessageKey;
  href?: string;
};

export function LocalizedSectionHeader({ titleKey, href }: LocalizedSectionHeaderProps) {
  const { t } = useLocale();
  return (
    <div className="mb-3 flex items-end justify-between gap-3">
      <h2 className="font-[family-name:var(--font-shop-display)] text-2xl tracking-tight text-[color:var(--shop-ink)]">
        {t(titleKey)}
      </h2>
      {href ? (
        <Link
          href={href}
          prefetch={false}
          className="pb-1 text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
        >
          {t("seeAll")}
        </Link>
      ) : null}
    </div>
  );
}

type LocalizedPageHeadingProps = {
  titleKey?: MessageKey;
  titleEn?: string;
  titleKm?: string | null;
  count?: number;
  emptyKey?: MessageKey;
  children?: ReactNode;
};

/** Page H1 that follows client locale. Prefer titleKey for UI chrome; titleEn/Km for CMS. */
export function LocalizedPageHeading({
  titleKey,
  titleEn,
  titleKm,
  count,
  emptyKey,
}: LocalizedPageHeadingProps) {
  const { locale, t } = useLocale();
  const title = titleKey
    ? t(titleKey)
    : localizedValue({ locale, en: titleEn ?? "", km: titleKm });

  return (
    <div>
      <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
        {title}
      </h1>
      {typeof count === "number" ? (
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
          {count} {count === 1 ? t("itemCount") : t("itemsCount")}
        </p>
      ) : null}
      {emptyKey ? (
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">{t(emptyKey)}</p>
      ) : null}
    </div>
  );
}

export function LocalizedEmptyState({
  messageKey,
  actionHref,
  actionKey,
}: {
  messageKey: MessageKey;
  actionHref?: string;
  actionKey?: MessageKey;
}) {
  const { t } = useLocale();
  return (
    <div className="rounded-2xl border border-dashed border-[color:var(--shop-line)] bg-[color:var(--shop-surface)]/50 px-4 py-12 text-center">
      <p className="text-sm text-[color:var(--shop-ink-muted)]">{t(messageKey)}</p>
      {actionHref && actionKey ? (
        <Link
          href={actionHref}
          className="mt-4 inline-flex text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
        >
          {t(actionKey)}
        </Link>
      ) : null}
    </div>
  );
}

export function LocalizedCheckoutHeader({
  cartHref,
  itemCount,
}: {
  cartHref: string;
  itemCount: number;
}) {
  const { t } = useLocale();
  return (
    <div>
      <Link
        href={cartHref}
        className="inline-flex text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
      >
        {t("backToCart")}
      </Link>
      <h1 className="mt-3 font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
        {t("checkout")}
      </h1>
      <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
        {itemCount} {itemCount === 1 ? t("itemCount") : t("itemsCount")}
      </p>
    </div>
  );
}

export function LocalizedAccountHome({
  displayName,
  profileHref,
  addressesHref,
  ordersHref,
  faqHref,
  addressesCount,
  defaultAddressLabel,
  ordersTotal,
}: {
  displayName: string;
  profileHref: string;
  addressesHref: string;
  ordersHref: string;
  faqHref: string;
  addressesCount: number;
  defaultAddressLabel: string | null;
  ordersTotal: number;
}) {
  const { t } = useLocale();
  const addressSummary =
    addressesCount === 0
      ? t("noAddressesYet")
      : `${addressesCount} · ${defaultAddressLabel ?? ""}`;
  const orderSummary = ordersTotal === 0 ? t("noOrdersYet") : `${ordersTotal}`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          {t("account")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">{displayName}</p>
      </div>

      <ul className="space-y-3">
        <li>
          <Link
            href={profileHref}
            prefetch={false}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">{t("profile")}</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              {t("fullName")}, {t("phone")}, {t("email")}
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={addressesHref}
            prefetch={false}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">{t("savedAddresses")}</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">{addressSummary}</p>
          </Link>
        </li>
        <li>
          <Link
            href={ordersHref}
            prefetch={false}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">{t("myOrders")}</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">{orderSummary}</p>
          </Link>
        </li>
        <li>
          <Link
            href={faqHref}
            prefetch={false}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">{t("helpFaq")}</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">{t("helpFaqHint")}</p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
