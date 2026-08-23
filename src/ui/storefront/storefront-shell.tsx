import Link from "next/link";
import type { ReactNode } from "react";
import { CircleHelp } from "lucide-react";

import { BrandImage } from "@/ui/storefront/brand-image";
import { STOREFRONT_BRAND } from "@/ui/storefront/brand";
import { StorefrontAsyncBoundary } from "@/ui/storefront/storefront-chrome";

type StorefrontShellProps = {
  tenantSlug: string;
  children: ReactNode;
};

export function StorefrontShell({ tenantSlug, children }: StorefrontShellProps) {
  const basePath = `/${tenantSlug}`;

  return (
    <div className="shop-shell min-h-dvh text-[color:var(--shop-ink)]">
      <header className="sticky top-0 z-20 border-b border-[color:var(--shop-line)] bg-[color:var(--shop-bg)]/90 backdrop-blur-md">
        <div
          className="mx-auto flex max-w-lg items-center justify-between px-4 py-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <Link href={basePath} className="flex min-w-0 items-center gap-3">
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
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href={`${basePath}/products`}
              className="rounded-full px-3 py-2 text-[color:var(--shop-ink)] transition hover:bg-[color:var(--shop-surface)]/70"
            >
              Shop
            </Link>
            <Link
              href={`${basePath}/faq`}
              prefetch={false}
              aria-label="Frequently Asked Questions"
              className="inline-flex size-10 items-center justify-center rounded-full text-[color:var(--shop-ink)] transition hover:bg-[color:var(--shop-surface)]/70"
            >
              <CircleHelp className="size-5" strokeWidth={1.75} />
            </Link>
            <StorefrontAsyncBoundary tenantSlug={tenantSlug} slot="header" />
          </nav>
        </div>
      </header>

      <main
        className="mx-auto max-w-lg px-4 pb-10"
        style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>

      <footer className="border-t border-[color:var(--shop-line)] bg-[color:var(--shop-surface)]/40">
        <div className="mx-auto flex max-w-lg flex-col items-center gap-2 px-4 py-6 text-center">
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
          <Link
            href={`${basePath}/faq`}
            className="text-xs font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
          >
            FAQ
          </Link>
          <StorefrontAsyncBoundary tenantSlug={tenantSlug} slot="footer" />
        </div>
      </footer>
    </div>
  );
}
