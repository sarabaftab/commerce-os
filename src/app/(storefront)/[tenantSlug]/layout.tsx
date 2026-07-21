import type { Metadata } from "next";
import { Fraunces } from "next/font/google";

import { getCartAction } from "@/modules/orders/actions/cart-actions";
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
    return {
      title: `${tenant.name} · Shop`,
      description: `Order from ${tenant.name}`,
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
  const cart = await getCartAction(tenantSlug);

  return (
    <div className={shopDisplay.variable}>
      <StorefrontShell
        tenantName={ctx.tenant.name}
        tenantSlug={ctx.tenant.slug}
        cartItemCount={cart.itemCount}
      >
        {children}
      </StorefrontShell>
    </div>
  );
}
