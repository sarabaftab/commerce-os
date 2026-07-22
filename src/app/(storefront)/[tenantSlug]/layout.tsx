import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

import { TelegramProvider } from "@/channels/telegram/client/telegram-provider";
import { getCartAction } from "@/modules/orders/actions/cart-actions";
import { getStorefrontSettings } from "@/modules/settings";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { StorefrontShell } from "@/ui/storefront/storefront-shell";

const shopDisplay = Fraunces({
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
      title: `${settings.displayName} · Shop`,
      description: `Order from ${settings.displayName}`,
    };
  } catch {
    return { title: "Shop" };
  }
}

export default async function StorefrontLayout({
  children,
  params,
}: StorefrontLayoutProps) {
  const { tenantSlug } = await params;
  const ctx = await resolveStorefrontTenant(tenantSlug);
  const [cart, settings] = await Promise.all([
    getCartAction(tenantSlug),
    getStorefrontSettings(ctx.tenant.id, ctx.tenant.slug),
  ]);

  return (
    <div
      className={shopDisplay.variable}
      style={{
        minHeight: "var(--tg-viewport-height, 100dvh)",
        paddingBottom: "var(--tg-safe-area-inset-bottom, 0px)",
      }}
    >
      <TelegramProvider tenantSlug={ctx.tenant.slug}>
        <StorefrontShell
          tenantName={settings.displayName}
          tenantSlug={ctx.tenant.slug}
          logoUrl={settings.logoUrl}
          primaryColor={settings.primaryColor}
          phone={settings.phone}
          cartItemCount={cart.itemCount}
        >
          {children}
        </StorefrontShell>
      </TelegramProvider>
    </div>
  );
}
