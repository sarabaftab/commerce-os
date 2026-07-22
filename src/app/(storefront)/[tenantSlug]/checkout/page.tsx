import Link from "next/link";
import { redirect } from "next/navigation";

import {
  readAttributionFromCookies,
  readCustomerSessionFromCookies,
} from "@/channels/telegram/server/customer-session";
import { findCustomerById } from "@/modules/customers/repositories/customer-repository";
import { CheckoutForm } from "@/modules/orders/components/checkout-form";
import { getCheckoutPreview } from "@/modules/orders";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { readGuestTokenFromCookies } from "@/shared/cart/cart-cookie";

export const dynamic = "force-dynamic";

type CheckoutPageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StorefrontCheckoutPage({ params }: CheckoutPageProps) {
  const { tenantSlug } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  const [guestToken, session, referralCode] = await Promise.all([
    readGuestTokenFromCookies(),
    readCustomerSessionFromCookies(tenant.id),
    readAttributionFromCookies(),
  ]);

  let customerDisplayName: string | null = null;
  if (session?.customerId) {
    const customer = await findCustomerById(tenant.id, session.customerId);
    customerDisplayName = customer?.displayName ?? null;
  }

  const preview = await getCheckoutPreview({
    tenantId: tenant.id,
    tenantSlug: tenant.slug,
    currency: tenant.currency,
    cartIdentity: {
      tenantId: tenant.id,
      guestToken,
      customerId: session?.customerId ?? null,
    },
    channel: session?.channel ?? "web",
    referralCode,
    customerDisplayName,
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

      {preview.checkoutBlockedReason ? (
        <p className="rounded-2xl bg-destructive/10 px-4 py-3 text-sm text-destructive">
          {preview.checkoutBlockedReason}
        </p>
      ) : (
        <CheckoutForm tenantSlug={tenantSlug} preview={preview} />
      )}
    </div>
  );
}
