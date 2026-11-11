"use client";

import Image from "next/image";
import Link from "next/link";
import type { ReactNode } from "react";

import { localizedValue, useLocale, type MessageKey } from "@/shared/i18n";

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

const HOME_HERO = {
  en: {
    src: "/storefront/home-hero-en.jpg",
    alt: "Your KIN A2 Favorites, Delivered.",
  },
  km: {
    src: "/storefront/home-hero-km.jpg",
    alt: "ផលិតផល KIN A2 ដែលអ្នកចូលចិត្ត ដឹកជញ្ជូនដល់ទីកន្លែង។",
  },
} as const;

/** Supplied artwork is 1024×512 (2:1). Shared ratio so language switches do not shift layout. */
const HOME_HERO_WIDTH = 1024;
const HOME_HERO_HEIGHT = 512;

export function LocalizedHomeHero() {
  const { locale } = useLocale();
  const hero = locale === "km" ? HOME_HERO.km : HOME_HERO.en;

  return (
    <section className="overflow-hidden rounded-[1.75rem]">
      <Image
        src={hero.src}
        alt={hero.alt}
        width={HOME_HERO_WIDTH}
        height={HOME_HERO_HEIGHT}
        priority
        sizes="(min-width: 1024px) 960px, (min-width: 768px) 720px, 100vw"
        className="h-auto w-full"
      />
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
