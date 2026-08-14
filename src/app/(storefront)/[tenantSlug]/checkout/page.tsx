import Link from "next/link";
import { redirect } from "next/navigation";

import {
  readAttributionFromCookies,
  readCustomerSessionFromCookies,
} from "@/channels/telegram/server/customer-session";
import { getCustomerProfile } from "@/modules/customers";
import { CheckoutForm } from "@/modules/orders/components/checkout-form";
import { getCheckoutPreview } from "@/modules/orders";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { readGuestTokenFromCookies } from "@/shared/cart/cart-cookie";
import { createTimer } from "@/shared/observability/timing";

export const dynamic = "force-dynamic";

type CheckoutPageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function StorefrontCheckoutPage({ params }: CheckoutPageProps) {
  const timer = createTimer("page.storefront.checkout");
  const { tenantSlug } = await params;
  const { tenant, basePath } = await resolveStorefrontTenant(tenantSlug);
  timer.mark("tenantMs");
  const [guestToken, session, referralCode] = await Promise.all([
    readGuestTokenFromCookies(),
    readCustomerSessionFromCookies(tenant.id),
    readAttributionFromCookies(),
  ]);
  timer.mark("sessionMs");

  let customerDisplayName: string | null = null;
  let customerFirstName: string | null = null;
  let customerLastName: string | null = null;
  let customerPhone: string | null = null;
  let customerEmail: string | null = null;

  if (session?.customerId) {
    const profile = await getCustomerProfile(tenant.id, session.customerId);
    customerDisplayName = profile.displayName;
    customerFirstName = profile.firstName;
    customerLastName = profile.lastName;
    customerPhone = profile.phone;
    customerEmail = profile.email;
  }
  timer.mark("profileMs");

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
    customerFirstName,
    customerLastName,
    customerPhone,
    customerEmail,
  });
  timer.mark("previewMs");
  timer.log({ tenantSlug, hasPreview: Boolean(preview) });

  if (!preview) {
    redirect(`${basePath}/cart`);
  }

  return (
    <div className="space-y-6 pt-4">
      <div>
        <Link
          href={`${basePath}/cart`}
          className="inline-flex text-sm font-medium text-[color:var(--shop-ink)] underline decoration-[color:var(--shop-primary)] underline-offset-4"
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
