import { getStorefrontPromotionBanner } from "@/modules/promotions";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { shop } from "@/ui/storefront/shop-classes";

type Props = {
  tenantSlug: string;
};

/** Non-intrusive campaign banner — active date-window promotions with banner text only. */
export async function StorefrontPromotionBanner({ tenantSlug }: Props) {
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const banner = await getStorefrontPromotionBanner(tenant.id);
  if (!banner) {
    return null;
  }

  return (
    <div
      className="border-b border-[color:var(--shop-line)] bg-[color:var(--shop-surface)]/80"
      role="status"
    >
      <p className={`py-2.5 text-center text-sm text-[color:var(--shop-ink)] ${shop.contentWidth}`}>
        <span className="font-medium">{banner.name}</span>
        <span className="text-[color:var(--shop-ink-muted)]"> — {banner.bannerText}</span>
      </p>
    </div>
  );
}
