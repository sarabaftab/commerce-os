"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import type { MessageKey } from "@/shared/i18n";
import { useLocale } from "@/shared/i18n";
import { cn } from "@/ui/lib/utils";
import { shop } from "@/ui/storefront/shop-classes";

type AccountNavProps = {
  tenantSlug: string;
};

const links: {
  key: string;
  suffix: string;
  labelKey: MessageKey;
  match: (p: string, base: string) => boolean;
}[] = [
  { key: "home", suffix: "", labelKey: "account", match: (p, base) => p === base || p === `${base}/` },
  {
    key: "profile",
    suffix: "/profile",
    labelKey: "profile",
    match: (p, base) => p.startsWith(`${base}/profile`),
  },
  {
    key: "addresses",
    suffix: "/addresses",
    labelKey: "addresses",
    match: (p, base) => p.startsWith(`${base}/addresses`),
  },
  {
    key: "orders",
    suffix: "/orders",
    labelKey: "myOrders",
    match: (p, base) => p.startsWith(`${base}/orders`),
  },
];

export function AccountNav({ tenantSlug }: AccountNavProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const base = `/${tenantSlug}/account`;

  return (
    <nav aria-label={t("account")} className="flex gap-1 overflow-x-auto pb-1 text-sm">
      {links.map((link) => {
        const href = `${base}${link.suffix}`;
        const active = link.match(pathname, base);
        return (
          <Link
            key={link.key}
            href={href}
            prefetch={false}
            className={cn(
              "rounded-full px-3 py-1.5 transition",
              active ? shop.navActive : shop.navIdle,
            )}
            aria-current={active ? "page" : undefined}
          >
            {t(link.labelKey)}
          </Link>
        );
      })}
    </nav>
  );
}
