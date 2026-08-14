import type { Metadata } from "next";
import { Inter, Manrope } from "next/font/google";
import { Suspense } from "react";

import { TelegramProvider } from "@/channels/telegram/client/telegram-provider";
import { getStorefrontSettings } from "@/modules/settings";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { STOREFRONT_BRAND } from "@/ui/storefront/brand";
import { StorefrontShell } from "@/ui/storefront/storefront-shell";

/**
 * Public storefront shell: no cookies/session reads.
 * Cart + account chrome are client islands; catalog pages use ISR (revalidate).
 */
export const revalidate = 60;

const shopSans = Inter({
  subsets: ["latin"],
  variable: "--font-shop-sans",
});

const shopDisplay = Manrope({
  subsets: ["latin"],
  variable: "--font-shop-display",
});

type StorefrontLayoutProps = {
  children: React.ReactNode;
  params: Promise<{ tenantSlug: string }>;
};

export async function generateMetadata({
  params,
}: {
  params: Promise<{ tenantSlug: string }>;
}): Promise<Metadata> {
  const { tenantSlug } = await params;
  try {
    const { tenant } = await resolveStorefrontTenant(tenantSlug);
    const settings = await getStorefrontSettings(tenant.id, tenant.slug);
    return {
      title: `${settings.displayName} · ${STOREFRONT_BRAND.shortName}`,
      description: `Shop with ${STOREFRONT_BRAND.name}`,
    };
  } catch {
    return { title: STOREFRONT_BRAND.name };
  }
}

export default async function StorefrontLayout({
  children,
  params,
}: StorefrontLayoutProps) {
  const { tenantSlug } = await params;
  // Tenant only — no cookies/session here (keeps public shell eligible for PPR).
  const ctx = await resolveStorefrontTenant(tenantSlug);

  return (
    <div
      className={`${shopSans.variable} ${shopDisplay.variable}`}
      style={{
        minHeight: "var(--tg-viewport-height, 100dvh)",
        paddingBottom: "var(--tg-safe-area-inset-bottom, 0px)",
      }}
    >
      {/*
        Telegram auth runs client-side. Session reuse is detected by the auth API
        (sessionReused) so we do not need an SSR cookie hint that would force dynamic.
      */}
      <TelegramProvider tenantSlug={ctx.tenant.slug}>
        <StorefrontShell tenantSlug={ctx.tenant.slug}>
          <Suspense
            fallback={
              <div className="animate-pulse space-y-4 pt-6">
                <div className="h-40 rounded-[1.75rem] bg-[color:var(--shop-surface)]/80" />
                <div className="h-6 w-1/3 rounded bg-[color:var(--shop-surface)]/80" />
                <div className="grid grid-cols-2 gap-3">
                  <div className="aspect-[4/3] rounded-2xl bg-[color:var(--shop-surface)]/80" />
                  <div className="aspect-[4/3] rounded-2xl bg-[color:var(--shop-surface)]/80" />
                </div>
              </div>
            }
          >
            {children}
          </Suspense>
        </StorefrontShell>
      </TelegramProvider>
    </div>
  );
}
