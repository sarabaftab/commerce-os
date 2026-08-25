import Link from "next/link";

import type { Category } from "@prisma/client";

import { cn } from "@/ui/lib/utils";
import { shop } from "@/ui/storefront/shop-classes";

type CategoryChipsProps = {
  categories: Category[];
  basePath: string;
  activeSlug?: string | null;
  allHref?: string;
};

export function CategoryChips({
  categories,
  basePath,
  activeSlug,
  allHref,
}: CategoryChipsProps) {
  const allLink = allHref ?? `${basePath}/products`;

  return (
    <div className="-mx-4 flex gap-2 overflow-x-auto px-4 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <Chip href={allLink} active={!activeSlug} label="All" />
      {categories.map((category) => (
        <Chip
          key={category.id}
          href={`${basePath}/products?category=${category.slug}`}
          active={activeSlug === category.slug}
          label={category.name}
        />
      ))}
    </div>
  );
}

function Chip({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <Link
      href={href}
      prefetch={false}
      className={cn(
        "shrink-0 rounded-full px-4 py-2 text-sm font-medium transition",
        active ? shop.chipActive : shop.chipIdle,
      )}
    >
      {label}
    </Link>
  );
}
