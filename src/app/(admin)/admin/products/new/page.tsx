import { getCategoriesForTenant } from "@/modules/catalog";
import { createProductAction } from "@/modules/catalog/actions/product-actions";
import { ProductForm } from "@/modules/catalog/components/product-form";
import { requireAdminSession } from "@/shared/auth/admin-session";

export default async function NewProductPage() {
  const session = await requireAdminSession();
  const categories = await getCategoriesForTenant(session.tenantId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New product</h1>
        <p className="text-sm text-muted-foreground">
          Add a sellable product to {session.tenantName}
        </p>
      </div>
      <ProductForm
        categories={categories}
        currency={session.tenantCurrency}
        action={createProductAction}
        submitLabel="Create product"
      />
    </div>
  );
}
