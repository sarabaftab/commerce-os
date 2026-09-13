import Link from "next/link";

import type { Promotion } from "@prisma/client";

import { formatMoney } from "@/shared/money/money";
import { buttonVariants } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

type Props = {
  promotions: Promotion[];
  currency: string;
};

function valueLabel(promo: Promotion, currency: string): string {
  if (promo.type === "percentage") {
    return `${promo.value}%`;
  }
  return formatMoney(promo.value, currency);
}

export function PromotionTable({ promotions, currency }: Props) {
  if (promotions.length === 0) {
    return (
      <p className="px-4 py-8 text-center text-sm text-[color:var(--admin-ink-muted)]">
        No promotions yet. Create a campaign to offer storefront discounts.
      </p>
    );
  }

  return (
    <table className="w-full text-left text-sm">
      <thead className="border-b border-[color:var(--admin-line)] bg-[color:var(--admin-surface)]/60 text-xs uppercase tracking-wide text-[color:var(--admin-ink-muted)]">
        <tr>
          <th className="px-4 py-3 font-medium">Name</th>
          <th className="px-4 py-3 font-medium">Discount</th>
          <th className="px-4 py-3 font-medium">Min subtotal</th>
          <th className="px-4 py-3 font-medium">Status</th>
          <th className="px-4 py-3 font-medium" />
        </tr>
      </thead>
      <tbody>
        {promotions.map((promo) => (
          <tr key={promo.id} className="border-b border-[color:var(--admin-line)] last:border-0">
            <td className="px-4 py-3">
              <p className="font-medium">{promo.name}</p>
              {promo.bannerText ? (
                <p className="mt-0.5 line-clamp-1 text-xs text-[color:var(--admin-ink-muted)]">
                  {promo.bannerText}
                </p>
              ) : null}
            </td>
            <td className="px-4 py-3">{valueLabel(promo, currency)}</td>
            <td className="px-4 py-3">
              {promo.minimumSubtotalMinor == null
                ? "—"
                : formatMoney(promo.minimumSubtotalMinor, currency)}
            </td>
            <td className="px-4 py-3">
              <span
                className={
                  promo.isActive ? "text-emerald-700" : "text-[color:var(--admin-ink-muted)]"
                }
              >
                {promo.isActive ? "Active" : "Inactive"}
              </span>
            </td>
            <td className="px-4 py-3 text-right">
              <Link
                href={`/admin/promotions/${promo.id}/edit`}
                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "rounded-full")}
              >
                Edit
              </Link>
            </td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}
