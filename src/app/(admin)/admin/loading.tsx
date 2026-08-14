export default function AdminLoading() {
  return (
    <div className="admin-shell min-h-dvh px-4 py-8 sm:px-6">
      <div className="mx-auto max-w-6xl animate-pulse space-y-6">
        <div className="h-10 w-48 rounded-xl bg-[color:var(--admin-surface)]" />
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <div
              key={i}
              className="h-28 rounded-2xl bg-[color:var(--admin-surface-elevated)] ring-1 ring-[color:var(--admin-line)]"
            />
          ))}
        </div>
        <div className="h-64 rounded-2xl bg-[color:var(--admin-surface-elevated)] ring-1 ring-[color:var(--admin-line)]" />
      </div>
    </div>
  );
}
