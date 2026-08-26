import { createCategoryAction } from "@/modules/catalog/actions/category-actions";
import { CategoryForm } from "@/modules/catalog/components/category-form";
import { requireAdminSession } from "@/shared/auth/admin-session";

export default async function NewCategoryPage() {
  const session = await requireAdminSession();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">New category</h1>
        <p className="text-sm text-muted-foreground">
          Add a storefront category for {session.tenantName}
        </p>
      </div>
      <CategoryForm action={createCategoryAction} submitLabel="Create category" />
    </div>
  );
}
