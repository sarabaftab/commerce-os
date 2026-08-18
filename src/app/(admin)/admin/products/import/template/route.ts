import { NextResponse } from "next/server";

import { PRODUCT_IMPORT_TEMPLATE_CSV } from "@/modules/catalog/import/csv";
import { requireAdminSession } from "@/shared/auth/admin-session";

export async function GET() {
  await requireAdminSession();
  return new NextResponse(PRODUCT_IMPORT_TEMPLATE_CSV, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": 'attachment; filename="products-template.csv"',
      "Cache-Control": "no-store",
    },
  });
}
