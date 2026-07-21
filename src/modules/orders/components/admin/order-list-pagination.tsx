import Link from "next/link";

import { Button } from "@/ui/components/ui/button";

type OrderListPaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  searchParams: Record<string, string>;
};

function buildHref(searchParams: Record<string, string>, page: number) {
  const params = new URLSearchParams(searchParams);
  params.set("page", String(page));
  return `/admin/orders?${params.toString()}`;
}

export function OrderListPagination({
  page,
  totalPages,
  total,
  searchParams,
}: OrderListPaginationProps) {
  return (
    <div className="flex items-center justify-between gap-3 text-sm">
      <p className="text-muted-foreground">
        {total} {total === 1 ? "order" : "orders"} · page {page} of {totalPages}
      </p>
      <div className="flex gap-2">
        {page > 1 ? (
          <Link href={buildHref(searchParams, page - 1)}>
            <Button variant="outline" size="sm">
              Previous
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Previous
          </Button>
        )}
        {page < totalPages ? (
          <Link href={buildHref(searchParams, page + 1)}>
            <Button variant="outline" size="sm">
              Next
            </Button>
          </Link>
        ) : (
          <Button variant="outline" size="sm" disabled>
            Next
          </Button>
        )}
      </div>
    </div>
  );
}
