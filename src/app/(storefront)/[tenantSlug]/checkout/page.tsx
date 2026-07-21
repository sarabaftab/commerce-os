import Link from "next/link";
import { redirect } from "next/navigation";

import { CheckoutForm } from "@/modules/orders/components/checkout-form";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { readGuestTokenFromCookies } from "@/shared/cart/cart-cookie";
import { getCheckoutPreview } from "@/modules/orders";

export const dynamic = "force-dynamic";

type CheckoutPageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StorefrontCheckoutPage({ params }: CheckoutPageProps) {
  const { tenantSlug } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  const guestToken = await readGuestTokenFromCookies();

  const preview = await getCheckoutPreview({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    currency: tenant.currency,
    tenantConfig: tenant.config,
    cartIdentity: {
      tenantId: tenant.id,
      guestToken,
      customerId: null,
    },
  });

  if (!preview) {
    redirect(`${basePath}/cart`);
  }

  return (
    <div className="space-y-6 pt-4">
      <div>
        <Link
          href={`${basePath}/cart`}
          className="inline-flex text-sm font-medium text-[color:var(--shop-accent)]"
        >
          ← Back to cart
        </Link>
        <h1 className="mt-3 font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          Checkout
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
          {preview.cart.itemCount} {preview.cart.itemCount === 1 ? "item" : "items"}
        </p>
      </div>

      <CheckoutForm tenantSlug={tenantSlug} preview={preview} />
    </div>
  );
}
