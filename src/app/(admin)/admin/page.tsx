import Link from "next/link";

import { getProductsForTenant } from "@/modules/catalog";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { createTimer } from "@/shared/observability/timing";
import { Button } from "@/ui/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/ui/components/ui/card";
import { TimingBadge } from "@/ui/admin/timing-badge";

export default async function AdminDashboardPage() {
  const timer = createTimer("page.admin.dashboard");

  const session = await requireAdminSession();
  timer.mark("sessionMs");

  const products = await getProductsForTenant(session.tenantId);
  timer.mark("productsMs");

  const timings = timer.log({ productCount: products.length });
  const availableCount = products.filter((product) => product.isAvailable).length;

  return (
    <div className="space-y-8">
      <TimingBadge
        route="/admin"
        timings={{
          session: Number(timings.sessionMs ?? 0),
          products: Number(timings.productsMs ?? 0) - Number(timings.sessionMs ?? 0),
          total: Number(timings.totalMs ?? 0),
        }}
      />

      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Dashboard</h1>
        <p className="text-sm text-muted-foreground">
          {session.tenantName} · admin console
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Products
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{products.length}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Available
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">{availableCount}</CardContent>
        </Card>
        <Card>
          <CardHeader>
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Currency
            </CardTitle>
          </CardHeader>
          <CardContent className="text-3xl font-semibold">
            {session.tenantCurrency}
          </CardContent>
        </Card>
      </div>

      <div className="flex gap-3">
        <Link href="/admin/products">
          <Button>Manage products</Button>
        </Link>
        <Link href="/admin/products/new">
          <Button variant="outline">New product</Button>
        </Link>
      </div>
    </div>
  );
}
