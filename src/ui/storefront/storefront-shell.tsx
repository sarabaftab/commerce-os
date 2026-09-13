"use client";

import Link from "next/link";
import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";

import { STOREFRONT_HEADER_INSET_STYLE } from "@/channels/telegram/client/telegram-viewport";
import { LanguageSwitcher, LocaleProvider, useLocale } from "@/shared/i18n";
import { BrandImage } from "@/ui/storefront/brand-image";
import { STOREFRONT_BRAND } from "@/ui/storefront/brand";
import { shop } from "@/ui/storefront/shop-classes";
import { StorefrontAsyncBoundary } from "@/ui/storefront/storefront-chrome";
import { StorefrontCartCountProvider } from "@/ui/storefront/storefront-cart-count";
import { StorefrontMain } from "@/ui/storefront/storefront-main";

type StorefrontShellProps = {
  tenantSlug: string;
  children: ReactNode;
};

function StorefrontShellChrome({ tenantSlug, children }: StorefrontShellProps) {
  const basePath = `/${tenantSlug}`;
  const { t } = useLocale();

  return (
    <StorefrontCartCountProvider tenantSlug={tenantSlug}>
      <div className="shop-shell text-[color:var(--shop-ink)]">
        <header className="sticky top-0 z-20 border-b border-[color:var(--shop-line)] bg-[color:var(--shop-bg)]/90 backdrop-blur-md">
          <div
            className="mx-auto flex w-full max-w-lg items-center justify-between gap-2 sm:max-w-2xl md:max-w-3xl lg:max-w-5xl"
            style={STOREFRONT_HEADER_INSET_STYLE}
          >
            <Link href={basePath} className="flex min-w-0 flex-1 items-center gap-2 sm:gap-3">
              <BrandImage
                src={STOREFRONT_BRAND.logoSrc}
                alt={STOREFRONT_BRAND.logoAlt}
                width={40}
                height={40}
                priority
                className="h-10 w-10 shrink-0"
              />
              <div className="min-w-0">
                <p className="truncate font-[family-name:var(--font-shop-display)] text-lg leading-none tracking-tight text-[color:var(--shop-ink)]">
                  {STOREFRONT_BRAND.shortName}
                </p>
                <p className="mt-1 truncate text-[10px] tracking-[0.14em] text-[color:var(--shop-ink-muted)] uppercase">
                  Consulting Co., Ltd.
                </p>
              </div>
            </Link>
            <nav className="flex shrink-0 items-center gap-0.5 text-sm sm:gap-1">
              <LanguageSwitcher className="mr-0.5 inline-flex items-center gap-0.5 rounded-full bg-[color:var(--shop-surface)]/80 p-0.5 text-[10px] font-semibold tracking-wide sm:mr-1 sm:text-[11px]" />
              <Link
                href={`${basePath}/products`}
                prefetch={false}
                className="rounded-full px-2.5 py-2 text-[color:var(--shop-ink)] transition hover:bg-[color:var(--shop-surface)]/70 sm:px-3"
              >
                {t("shop")}
              </Link>
              <Link
                href={`${basePath}/faq`}
                prefetch={false}
                aria-label={t("faqAriaLabel")}
                className="inline-flex size-10 items-center justify-center rounded-full text-[color:var(--shop-ink)] transition hover:bg-[color:var(--shop-surface)]/70"
              >
                <CircleHelp className="size-5" strokeWidth={1.75} />
              </Link>
              <StorefrontAsyncBoundary tenantSlug={tenantSlug} slot="header" />
            </nav>
          </div>
        </header>

        <StorefrontMain tenantSlug={tenantSlug}>{children}</StorefrontMain>

        <footer className="border-t border-[color:var(--shop-line)] bg-[color:var(--shop-surface)]/40">
          <div className={`flex flex-col items-center gap-2 py-6 text-center ${shop.contentWidth}`}>
            <BrandImage
              src={STOREFRONT_BRAND.logoSrc}
              alt=""
              width={32}
              height={32}
              className="h-8 w-8 opacity-90"
            />
            <p className="text-xs font-medium tracking-wide text-[color:var(--shop-ink)]">
              {STOREFRONT_BRAND.name}
            </p>
            <LanguageSwitcher />
            <Link
              href={`${basePath}/faq`}
              className="text-xs font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
            >
              {t("faq")}
            </Link>
            <StorefrontAsyncBoundary tenantSlug={tenantSlug} slot="footer" />
          </div>
        </footer>
      </div>
    </StorefrontCartCountProvider>
  );
}

export function StorefrontShell({ tenantSlug, children }: StorefrontShellProps) {
  return (
    <LocaleProvider>
      <StorefrontShellChrome tenantSlug={tenantSlug}>{children}</StorefrontShellChrome>
    </LocaleProvider>
  );
}
