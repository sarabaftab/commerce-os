import { listCategories } from "../repositories/category-repository";

export async function getCategoriesForTenant(tenantId: string) {
  return listCategories(tenantId);
}
