import Link from "next/link";

import { getProductsForTenant } from "@/modules/catalog";
import { ProductTable } from "@/modules/catalog/components/product-table";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { createTimer } from "@/shared/observability/timing";
import { Button } from "@/ui/components/ui/button";
import { TimingBadge } from "@/ui/admin/timing-badge";

export default async function AdminProductsPage() {
  const timer = createTimer("page.admin.products");

  const session = await requireAdminSession();
  timer.mark("sessionMs");

  const products = await getProductsForTenant(session.tenantId);
  timer.mark("productsMs");

  const timings = timer.log({ productCount: products.length });

  return (
    <div className="space-y-6">
      <TimingBadge
        route="/admin/products"
        timings={{
          session: Number(timings.sessionMs ?? 0),
          products: Number(timings.productsMs ?? 0) - Number(timings.sessionMs ?? 0),
          total: Number(timings.totalMs ?? 0),
        }}
      />

      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Products</h1>
          <p className="text-sm text-muted-foreground">
            Catalog for {session.tenantName}
          </p>
        </div>
        <Link href="/admin/products/new">
          <Button>New product</Button>
        </Link>
      </div>

      <ProductTable products={products} />
    </div>
  );
}
