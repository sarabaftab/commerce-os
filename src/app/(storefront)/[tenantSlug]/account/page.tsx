import Link from "next/link";

import {
  getCustomerProfile,
  listCustomerAddresses,
  listCustomerOrders,
  loadAccountPageSession,
} from "@/modules/customers";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { getRequestLocale } from "@/shared/i18n/get-request-locale";
import { t } from "@/shared/i18n";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{ tenantSlug: string }>;
};

export default async function AccountHomePage({ params }: PageProps) {
  const { tenantSlug } = await params;
  const locale = await getRequestLocale();
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
  const displayName =
    profile.displayName ||
    [profile.firstName, profile.lastName].filter(Boolean).join(" ") ||
    t(locale, "myAccount");

  return (
    <div className="space-y-5">
      <div>
        <h1 className="font-[family-name:var(--font-shop-display)] text-3xl tracking-tight">
          {t(locale, "account")}
        </h1>
        <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">{displayName}</p>
      </div>

      <ul className="space-y-3">
        <li>
          <Link
            href={`${base}/profile`}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">{t(locale, "profile")}</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              {t(locale, "fullName")}, {t(locale, "phone")}, {t(locale, "email")}
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={`${base}/addresses`}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">{t(locale, "savedAddresses")}</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              {addresses.length === 0
                ? t(locale, "noAddressesYet")
                : `${addresses.length} · ${addresses.find((a) => a.isDefault)?.label ?? ""}`}
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={`${base}/orders`}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">{t(locale, "myOrders")}</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              {orders.total === 0 ? t(locale, "noOrdersYet") : `${orders.total}`}
            </p>
          </Link>
        </li>
        <li>
          <Link
            href={`/${tenantSlug}/faq`}
            className="block rounded-2xl bg-[color:var(--shop-surface-elevated)] p-4 ring-1 ring-[color:var(--shop-line)]"
          >
            <p className="text-sm font-semibold">{t(locale, "helpFaq")}</p>
            <p className="mt-1 text-sm text-[color:var(--shop-ink-muted)]">
              {t(locale, "helpFaqHint")}
            </p>
          </Link>
        </li>
      </ul>
    </div>
  );
}
