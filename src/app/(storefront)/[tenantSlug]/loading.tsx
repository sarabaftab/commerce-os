export default function StorefrontLoading() {
  return (
    <div className="shop-shell min-h-dvh px-4 pt-6">
      <div className="mx-auto max-w-lg animate-pulse space-y-4">
        <div className="h-12 rounded-full bg-[color:var(--shop-surface)]/80" />
        <div className="h-44 rounded-[1.75rem] bg-[color:var(--shop-surface)]/80" />
        <div className="h-6 w-1/3 rounded bg-[color:var(--shop-surface)]/70" />
        <div className="grid grid-cols-2 gap-3">
          <div className="aspect-[4/3] rounded-2xl bg-[color:var(--shop-surface)]/80" />
          <div className="aspect-[4/3] rounded-2xl bg-[color:var(--shop-surface)]/80" />
        </div>
      </div>
    </div>
  );
}
