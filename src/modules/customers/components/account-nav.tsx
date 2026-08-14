"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/ui/lib/utils";
import { shop } from "@/ui/storefront/shop-classes";

type AccountNavProps = {
  tenantSlug: string;
};

const links = [
  { key: "home", suffix: "", label: "Account", match: (p: string, base: string) => p === base || p === `${base}/` },
  {
    key: "profile",
    suffix: "/profile",
    label: "Profile",
    match: (p: string, base: string) => p.startsWith(`${base}/profile`),
  },
  {
    key: "addresses",
    suffix: "/addresses",
    label: "Addresses",
    match: (p: string, base: string) => p.startsWith(`${base}/addresses`),
  },
  {
    key: "orders",
    suffix: "/orders",
    label: "Orders",
    match: (p: string, base: string) => p.startsWith(`${base}/orders`),
  },
] as const;

export function AccountNav({ tenantSlug }: AccountNavProps) {
  const pathname = usePathname();
  const base = `/${tenantSlug}/account`;

  return (
    <nav aria-label="Account" className="flex gap-1 overflow-x-auto pb-1 text-sm">
      {links.map((link) => {
        const href = `${base}${link.suffix}`;
        const active = link.match(pathname, base);
        return (
          <Link
            key={link.key}
            href={href}
            className={cn(
              "rounded-full px-3 py-1.5 transition",
              active ? shop.navActive : shop.navIdle,
            )}
            aria-current={active ? "page" : undefined}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
