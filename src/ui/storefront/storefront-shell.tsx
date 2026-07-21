import Link from "next/link";

import { CartIconLink } from "@/ui/storefront/cart-icon-link";

type StorefrontShellProps = {
  tenantName: string;
  tenantSlug: string;
  cartItemCount?: number;
  children: React.ReactNode;
};

export function StorefrontShell({
  tenantName,
  tenantSlug,
  cartItemCount = 0,
  children,
}: StorefrontShellProps) {
  const basePath = `/${tenantSlug}`;

  return (
    <div className="shop-shell min-h-dvh text-[color:var(--shop-ink)]">
      <header className="sticky top-0 z-20 border-b border-[color:var(--shop-line)] bg-[color:var(--shop-bg)]/90 backdrop-blur-md">
        <div
          className="mx-auto flex max-w-lg items-center justify-between px-4 py-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <Link href={basePath} className="min-w-0">
            <p className="font-[family-name:var(--font-shop-display)] text-xl leading-none tracking-tight">
              {tenantName}
            </p>
            <p className="mt-1 text-[11px] tracking-[0.16em] text-[color:var(--shop-ink-muted)] uppercase">
              Fresh delivery
            </p>
          </Link>
          <nav className="flex items-center gap-1 text-sm">
            <Link
              href={`${basePath}/products`}
              className="rounded-full px-3 py-2 text-[color:var(--shop-ink)] transition hover:bg-white/60"
            >
              Shop
            </Link>
            <CartIconLink basePath={basePath} itemCount={cartItemCount} />
          </nav>
        </div>
      </header>

      <main
        className="mx-auto max-w-lg px-4 pb-10"
        style={{ paddingBottom: "max(2.5rem, env(safe-area-inset-bottom))" }}
      >
        {children}
      </main>
    </div>
  );
}
