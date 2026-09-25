"use client";

import {
  TELEGRAM_ACCOUNT_ACCESS_QUERY,
  TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY,
} from "@/channels/telegram/account-access-constants";
import type { MessageKey } from "@/shared/i18n";
import { useLocale } from "@/shared/i18n";
import { cn } from "@/ui/lib/utils";
import { shop } from "@/ui/storefront/shop-classes";
import Link from "next/link";
import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";

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

function withAccessProof(href: string, code: string | null): string {
  if (!code) {
    return href;
  }
  const [pathname, existingQuery = ""] = href.split("?");
  const params = new URLSearchParams(existingQuery);
  params.set(TELEGRAM_ACCOUNT_ACCESS_QUERY, code);
  return `${pathname}?${params.toString()}`;
}

export function AccountNav({ tenantSlug }: AccountNavProps) {
  const pathname = usePathname();
  const { t } = useLocale();
  const base = `/${tenantSlug}/account`;
  const [accessCode, setAccessCode] = useState<string | null>(null);

  useEffect(() => {
    try {
      setAccessCode(sessionStorage.getItem(TELEGRAM_ACCOUNT_ACCESS_STORAGE_KEY)?.trim() || null);
    } catch {
      setAccessCode(null);
    }
  }, []);

  return (
    <nav aria-label={t("account")} className="flex gap-1 overflow-x-auto pb-1 text-sm">
      {links.map((link) => {
        const href = withAccessProof(`${base}${link.suffix}`, accessCode);
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
