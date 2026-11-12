"use client";

import type { MembershipRole } from "@prisma/client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CircleHelp,
  FolderTree,
  LayoutDashboard,
  Megaphone,
  Package,
  Percent,
  Settings2,
  ShoppingBag,
  Users,
} from "lucide-react";

import { isAdminManagerRole } from "@/shared/auth/admin-roles";
import { cn } from "@/ui/lib/utils";

const links = [
  { href: "/admin", label: "Dashboard", icon: LayoutDashboard },
  { href: "/admin/orders", label: "Orders", icon: ShoppingBag },
  { href: "/admin/customers", label: "Customers", icon: Users },
  { href: "/admin/products", label: "Products", icon: Package },
  { href: "/admin/categories", label: "Categories", icon: FolderTree },
  { href: "/admin/promotions", label: "Promotions", icon: Percent },
  {
    href: "/admin/broadcasts",
    label: "Broadcasts",
    icon: Megaphone,
    managerOnly: true,
  },
  { href: "/admin/faqs", label: "FAQs", icon: CircleHelp },
  {
    href: "/admin/settings",
    label: "Settings",
    icon: Settings2,
    managerOnly: true,
  },
] as const;

type AdminNavProps = {
  orientation?: "vertical" | "horizontal";
  role: MembershipRole;
};

export function AdminNav({ orientation = "vertical", role }: AdminNavProps) {
  const pathname = usePathname();
  const horizontal = orientation === "horizontal";
  const canManage = isAdminManagerRole(role);

  return (
    <nav
      className={cn(
        horizontal
          ? "flex gap-1 overflow-x-auto pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
          : "flex flex-col gap-1",
      )}
      aria-label="Admin"
    >
      {links
        .filter((link) => !("managerOnly" in link && link.managerOnly) || canManage)
        .map((link) => {
          const active =
            link.href === "/admin"
              ? pathname === "/admin"
              : pathname.startsWith(link.href);
          const Icon = link.icon;

          return (
            <Link
              key={link.href}
              href={link.href}
              className={cn(
                "inline-flex items-center gap-2.5 rounded-xl text-sm font-medium transition",
                horizontal ? "shrink-0 px-3 py-2" : "px-3 py-2.5",
                active
                  ? "bg-[color:var(--admin-primary)] text-[color:var(--admin-on-primary)] shadow-sm"
                  : "text-[color:var(--admin-ink-muted)] hover:bg-[color:var(--admin-surface)] hover:text-[color:var(--admin-ink)]",
              )}
            >
              <Icon className="size-4 shrink-0 opacity-90" strokeWidth={1.75} />
              {link.label}
            </Link>
          );
        })}
    </nav>
  );
}
