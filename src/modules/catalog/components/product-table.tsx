import Link from "next/link";

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
import { formatMoney } from "@/shared/money/money";

import { DeleteProductButton } from "./delete-product-button";

export type AdminProductListRow = {
  id: string;
  name: string;
  slug: string;
  priceMinor: number;
  currency: string;
  isAvailable: boolean;
  category: { id: string; name: string } | null;
};

type ProductTableProps = {
  products: AdminProductListRow[];
};

export function ProductTable({ products }: ProductTableProps) {
  if (products.length === 0) {
    return (
      <div className="px-4 py-12 text-center text-sm text-[color:var(--admin-ink-muted)]">
        No products yet. Create your first product to start selling.
      </div>
    );
  }

  return (
    <div>
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
