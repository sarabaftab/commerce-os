import Link from "next/link";

import {
  getCustomerProfile,
  listCustomerAddresses,
  listCustomerOrders,
  loadAccountPageSession,
} from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function AccountHomePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const session = await loadAccountPageSession(tenant.id);
  if (!session) {
    return null;
  }
  const [profile, addresses, orders] = await Promise.all([
    getCustomerProfile(session.tenantId, session.customerId),
    listCustomerAddresses(session.tenantId, session.customerId),
    listCustomerOrders({
      tenantId: session.tenantId,
      customerId: session.customerId,
      pageSize: 3,
    }),
  ]);

  const base = `/${tenantSlug}/account`;

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          Account
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
          {profile.displayName ||
            [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
            "Your account"}
        </p>
      </div>

      <ul className="space-y-3">
        <li>
          <Link
            href={`${base}/profile`}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">Profile</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              Name, phone, and email
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={`${base}/addresses`}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">Saved addresses</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              {addresses.length === 0
                ? "No addresses yet"
                : `${addresses.length} saved · ${addresses.find((a) => a.isDefault)?.label ?? "no default"}`}
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={`${base}/orders`}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">My orders</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              {orders.total === 0
                ? "No orders yet"
                : `${orders.total} order${orders.total === 1 ? "" : "s"}`}
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={`/${tenantSlug}/faq`}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">Help / FAQ</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              Common questions about ordering and delivery
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
