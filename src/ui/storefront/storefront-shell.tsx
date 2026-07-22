import Link from "next/link";

import { CartIconLink } from "@/ui/storefront/cart-icon-link";

type StorefrontShellProps = {
  tenantName: string;
  tenantSlug: string;
  logoUrl?: string | null;
  primaryColor?: string | null;
  phone?: string | null;
  cartItemCount?: number;
  children: React.ReactNode;
};

export function StorefrontShell({
  tenantName,
  tenantSlug,
  logoUrl,
  primaryColor,
  phone,
  cartItemCount = 0,
  children,
}: StorefrontShellProps) {
  const basePath = `/${tenantSlug}`;

  return (
    <div
      className="shop-shell min-h-dvh text-[color:var(--shop-ink)]"
      style={
        primaryColor
          ? ({ ["--shop-accent" as string]: primaryColor } as React.CSSProperties)
          : undefined
      }
    >
      <header className="sticky top-0 z-20 border-b border-[color:var(--shop-line)] bg-[color:var(--shop-bg)]/90 backdrop-blur-md">
        <div
          className="mx-auto flex max-w-lg items-center justify-between px-4 py-3"
          style={{ paddingTop: "max(0.75rem, env(safe-area-inset-top))" }}
        >
          <Link href={basePath} className="flex min-w-0 items-center gap-3">
            {logoUrl ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={logoUrl}
                alt={tenantName}
                className="h-9 w-9 rounded-full object-cover ring-1 ring-[color:var(--shop-line)]"
              />
            ) : null}
            <div className="min-w-0">
              <p className="font-[family-name:var(--font-shop-display)] text-xl leading-none tracking-tight">
                {tenantName}
              </p>
              <p className="mt-1 text-[11px] tracking-[0.16em] text-[color:var(--shop-ink-muted)] uppercase">
                {phone ?? "Fresh delivery"}
              </p>
            </div>
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
