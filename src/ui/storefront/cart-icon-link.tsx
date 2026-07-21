import Link from "next/link";
import { ShoppingBag } from "lucide-react";

type CartIconLinkProps = {
  basePath: string;
  itemCount: number;
};

export function CartIconLink({ basePath, itemCount }: CartIconLinkProps) {
  return (
    <Link
      href={`${basePath}/cart`}
      className="relative inline-flex size-10 items-center justify-center rounded-full text-[color:var(--shop-ink)] transition hover:bg-white/60"
      aria-label={`Cart, ${itemCount} items`}
    >
      <ShoppingBag className="size-5" strokeWidth={1.75} />
      {itemCount > 0 ? (
        <span className="absolute -top-0.5 -right-0.5 flex min-w-[1.125rem] items-center justify-center rounded-full bg-[color:var(--shop-accent)] px-1 text-[10px] font-semibold text-white">
          {itemCount > 99 ? "99+" : itemCount}
        </span>
      ) : null}
    </Link>
  );
}
