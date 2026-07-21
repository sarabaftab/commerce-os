import Link from "next/link";

import type { ProductWithRelations } from "@/modules/catalog";
import { formatMoney } from "@/shared/money/money";
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

import { DeleteProductButton } from "./delete-product-button";

type ProductTableProps = {
  products: ProductWithRelations[];
};

export function ProductTable({ products }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed p-10 text-center text-sm text-muted-foreground">
        No products yet. Create your first product to start selling.
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Category</TableHead>
            <TableHead>Price</TableHead>
            <TableHead>Availability</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {products.map((product) => (
            <TableRow key={product.id}>
              <TableCell>
                <div className="font-medium">{product.name}</div>
                <div className="text-xs text-muted-foreground">{product.slug}</div>
              </TableCell>
              <TableCell>{product.category?.name ?? "—"}</TableCell>
              <TableCell>
                {formatMoney(product.priceMinor, product.currency)}
              </TableCell>
              <TableCell>
                <Badge variant={product.isAvailable ? "default" : "secondary"}>
                  {product.isAvailable ? "Available" : "Unavailable"}
                </Badge>
              </TableCell>
              <TableCell className="text-right">
                <div className="flex justify-end gap-2">
                  <Link href={`/admin/products/${product.id}/edit`}>
                    <Button variant="outline" size="sm">
                      Edit
                    </Button>
                  </Link>
                  <DeleteProductButton productId={product.id} />
                </div>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
