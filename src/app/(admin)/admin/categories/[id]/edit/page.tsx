import { notFound } from "next/navigation";

import { updateCategoryAction } from "@/modules/catalog/actions/category-actions";
import { CategoryForm } from "@/modules/catalog/components/category-form";
import { getCategoryForTenant } from "@/modules/catalog";
import { requireAdminSession } from "@/shared/auth/admin-session";
import { isAppError } from "@/shared/errors/app-error";

type EditCategoryPageProps = {
  params: Promise<{ id: string }>;
};

export default async function EditCategoryPage({ params }: EditCategoryPageProps) {
  const session = await requireAdminSession();
  const { id } = await params;

  let category;
  try {
    category = await getCategoryForTenant(session.tenantId, id);
  } catch (error) {
    if (isAppError(error) && error.code === "NOT_FOUND") {
      notFound();
    }
    throw error;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Edit category</h1>
        <p className="text-sm text-muted-foreground">{category.name}</p>
      </div>
      <CategoryForm
        category={category}
        action={updateCategoryAction.bind(null, category.id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
