import { shop } from "@/ui/storefront/shop-classes";

export default function StorefrontLoading() {
  return (
    <div className="shop-shell pt-6">
      <div className={`animate-pulse space-y-4 ${shop.contentWidth}`}>
        <div className="h-12 rounded-full bg-[color:var(--shop-surface)]/80" />
        <div className="h-44 rounded-[1.75rem] bg-[color:var(--shop-surface)]/80" />
        <div className="h-6 w-1/3 rounded bg-[color:var(--shop-surface)]/70" />
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          <div className="aspect-[4/3] rounded-2xl bg-[color:var(--shop-surface)]/80" />
          <div className="aspect-[4/3] rounded-2xl bg-[color:var(--shop-surface)]/80" />
          <div className="hidden aspect-[4/3] rounded-2xl bg-[color:var(--shop-surface)]/80 sm:block" />
          <div className="hidden aspect-[4/3] rounded-2xl bg-[color:var(--shop-surface)]/80 lg:block" />
        </div>
      </div>
    </div>
  );
}
