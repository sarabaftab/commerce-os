import { notFound } from "next/navigation";

import { getCategoriesForTenant, getProductForTenant } from "@/modules/catalog";
import { updateProductAction } from "@/modules/catalog/actions/product-actions";
import { ProductForm } from "@/modules/catalog/components/product-form";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

export default async function EditProductPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requireAdminSession();
  const { id } = await params;

  let product;
  try {
    product = await getProductForTenant(session.tenantId, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  const categories = await getCategoriesForTenant(session.tenantId);
  const boundUpdate = updateProductAction.bind(null, product.id);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit product</h1>
        <p className="text-sm text-muted-foreground">{product.name}</p>
      </div>
      <ProductForm
        categories={categories}
        currency={session.tenantCurrency}
        product={product}
        action={boundUpdate}
        submitLabel="Save changes"
      />
    </div>
  );
}
