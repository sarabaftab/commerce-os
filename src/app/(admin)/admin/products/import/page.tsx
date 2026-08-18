import Link from "next/link";

import { ProductImportForm } from "@/modules/catalog/components/product-import-form";
import { requireAdminSession } from "@/shared/auth/admin-session";

export default async function ImportProductsPage() {
  const session = await requireAdminSession();

  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/products"
          className="text-sm font-medium underline underline-offset-4"
        >
          ← Products
        </Link>
        <h1 className="mt-3 text-2xl font-semibold tracking-tight">Import products</h1>
        <p className="text-sm text-[color:var(--admin-ink-muted)]">
          Add many products to {session.tenantName} from a CSV. Images are added later in
          the product editor.
        </p>
      </div>
      <ProductImportForm currency={session.tenantCurrency} />
    </div>
  );
}
