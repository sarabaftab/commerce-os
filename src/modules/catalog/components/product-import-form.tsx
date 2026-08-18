"use client";

import Link from "next/link";
import { useActionState } from "react";

import {
  confirmProductImportAction,
  previewProductImportAction,
  type ProductImportConfirmState,
  type ProductImportPreviewState,
} from "@/modules/catalog/actions/product-import-actions";
import { formatMoney } from "@/shared/money/money";
import { Button } from "@/ui/components/ui/button";
import { cn } from "@/ui/lib/utils";

const initialPreview: ProductImportPreviewState = {};
const initialConfirm: ProductImportConfirmState = {};

export function ProductImportForm({ currency }: { currency: string }) {
  const [previewState, previewAction, previewPending] = useActionState(
    previewProductImportAction,
    initialPreview,
  );
  const [confirmState, confirmAction, confirmPending] = useActionState(
    confirmProductImportAction,
    initialConfirm,
  );

  const preview = previewState.preview;
  const validItems =
    preview?.rows
      .filter((row) => row.valid && row.categoryId)
      .map((row) => ({
        name: row.name,
        slug: row.slug,
        description: row.description,
        categoryId: row.categoryId,
        brand: row.brand,
        volume: row.volume,
        priceMinor: row.priceMinor,
        isAvailable: row.active,
      })) ?? [];

  return (
    <div className="space-y-6">
      <form action={previewAction} className="space-y-4 rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)] p-5">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div>
            <p className="text-sm font-medium">Upload CSV</p>
            <p className="mt-1 text-xs text-[color:var(--admin-ink-muted)]">
              Columns: name, slug, description, category, brand, volume, price, active
            </p>
          </div>
          <a
            href="/admin/products/import/template"
            download="products-template.csv"
            className="text-sm font-medium underline underline-offset-4"
          >
            Download template
          </a>
        </div>
        <input
          name="file"
          type="file"
          accept=".csv,text/csv"
          required
          className="block w-full text-sm"
        />
        {previewState.error ? (
          <p className="text-sm text-destructive">{previewState.error}</p>
        ) : null}
        <Button type="submit" disabled={previewPending}>
          {previewPending ? "Validating…" : "Preview import"}
        </Button>
      </form>

      {preview ? (
        <div className="space-y-4">
          <p className="text-sm text-[color:var(--admin-ink-muted)]">
            {preview.validCount} valid · {preview.invalidCount} invalid
          </p>
          <div className="overflow-x-auto rounded-2xl border border-[color:var(--admin-line)] bg-[color:var(--admin-surface-elevated)]">
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="border-b border-[color:var(--admin-line)] text-xs uppercase text-[color:var(--admin-ink-muted)]">
                <tr>
                  <th className="px-3 py-2 font-medium">Name</th>
                  <th className="px-3 py-2 font-medium">Description</th>
                  <th className="px-3 py-2 font-medium">Category</th>
                  <th className="px-3 py-2 font-medium">Brand</th>
                  <th className="px-3 py-2 font-medium">Volume</th>
                  <th className="px-3 py-2 font-medium">Price</th>
                  <th className="px-3 py-2 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {preview.rows.map((row) => (
                  <tr
                    key={`${row.lineNumber}-${row.slug || row.name}`}
                    className="border-b border-[color:var(--admin-line)] last:border-0"
                  >
                    <td className="px-3 py-2 font-medium">{row.name}</td>
                    <td className="max-w-[16rem] truncate px-3 py-2 text-[color:var(--admin-ink-muted)]">
                      {row.description ?? "—"}
                    </td>
                    <td className="px-3 py-2">{row.category || "—"}</td>
                    <td className="px-3 py-2">{row.brand ?? "—"}</td>
                    <td className="px-3 py-2">{row.volume ?? "—"}</td>
                    <td className="px-3 py-2">
                      {row.valid ? formatMoney(row.priceMinor, currency) : row.priceMajor || "—"}
                    </td>
                    <td className="px-3 py-2">
                      <span
                        className={cn(
                          "rounded-full px-2 py-0.5 text-xs font-medium",
                          row.valid
                            ? "bg-emerald-500/15 text-emerald-800"
                            : "bg-destructive/10 text-destructive",
                        )}
                      >
                        {row.valid ? "Valid" : row.errors.join("; ")}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {confirmState.error ? (
            <p className="text-sm text-destructive">{confirmState.error}</p>
          ) : null}

          {validItems.length > 0 ? (
            <form action={confirmAction}>
              <input type="hidden" name="payload" value={JSON.stringify(validItems)} />
              <div className="flex flex-wrap items-center gap-3">
                <Button type="submit" disabled={confirmPending}>
                  {confirmPending
                    ? "Importing…"
                    : `Import ${validItems.length} valid product${validItems.length === 1 ? "" : "s"}`}
                </Button>
                <Link href="/admin/products" className="text-sm underline underline-offset-4">
                  Cancel
                </Link>
              </div>
            </form>
          ) : (
            <p className="text-sm text-[color:var(--admin-ink-muted)]">
              Fix the CSV errors and preview again. Nothing will be written until you confirm.
            </p>
          )}
        </div>
      ) : null}
    </div>
  );
}
