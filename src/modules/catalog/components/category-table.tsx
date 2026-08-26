"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

import { deleteCategoryAction } from "@/modules/catalog/actions/category-actions";
import type { CategoryWithProductCount } from "@/modules/catalog/repositories/category-repository";
import { Badge } from "@/ui/components/ui/badge";
import { Button } from "@/ui/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/ui/components/ui/table";

type CategoryTableProps = {
  categories: CategoryWithProductCount[];
};

export function CategoryTable({ categories }: CategoryTableProps) {
  if (categories.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-[color:var(--admin-ink-muted)]">
        No categories yet. Add your first category.
      </div>
    );
  }

  return (
    <div>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Slug</TableHead>
            <TableHead>Products</TableHead>
            <TableHead>Status</TableHead>
            <TableHead>Sort</TableHead>
            <TableHead>Last updated</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {categories.map((category) => (
            <TableRow key={category.id}>
              <TableCell className="font-medium">{category.name}</TableCell>
              <TableCell className="text-xs text-[color:var(--admin-ink-muted)]">
                {category.slug}
              </TableCell>
              <TableCell>{category._count.products}</TableCell>
              <TableCell>
                <Badge variant={category.isActive ? "default" : "secondary"}>
                  {category.isActive ? "Active" : "Inactive"}
                </Badge>
              </TableCell>
              <TableCell>{category.sortOrder}</TableCell>
              <TableCell className="text-xs text-[color:var(--admin-ink-muted)]">
                {category.updatedAt.toLocaleString()}
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/categories/${category.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <DeleteCategoryButton
                    categoryId={category.id}
                    productCount={category._count.products}
                  />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}

function DeleteCategoryButton({
  categoryId,
  productCount,
}: {
  categoryId: string;
  productCount: number;
}) {
  const router = useRouter();
  const [pending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <div className="flex flex-col items-end gap-1">
      <Button
        type="button"
        variant="destructive"
        size="sm"
        disabled={pending}
        onClick={() => {
          setError(null);
          if (productCount > 0) {
            setError(
              `Move or remove ${productCount} product${productCount === 1 ? "" : "s"} first, or deactivate instead.`,
            );
            return;
          }
          if (!window.confirm("Delete this empty category?")) {
            return;
          }
          startTransition(async () => {
            const result = await deleteCategoryAction(categoryId);
            if (result.error) {
              setError(result.error);
              return;
            }
            router.refresh();
          });
        }}
      >
        {pending ? "Deleting…" : "Delete"}
      </Button>
      {error ? <p className="max-w-[14rem] text-right text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
