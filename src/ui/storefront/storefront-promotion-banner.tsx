import { getStorefrontPromotionBanner } from "@/modules/promotions";
import { resolveStorefrontTenant } from "@/modules/storefront";
import { StorefrontPromotionBannerView } from "@/ui/storefront/storefront-promotion-banner-view";

type Props = {
  tenantSlug: string;
};

/** Server loader for campaign banner — keeps tenant/promotion services off the client graph. */
export async function StorefrontPromotionBanner({ tenantSlug }: Props) {
  const { tenant } = await resolveStorefrontTenant(tenantSlug);
  const banner = await getStorefrontPromotionBanner(tenant.id);
  if (!banner) {
    return null;
  }

  return (
    <StorefrontPromotionBannerView
      name={banner.name}
      bannerText={banner.bannerText}
      type={banner.type}
    />
  );
}
