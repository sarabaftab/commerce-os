type TimingBadgeProps = {
  route: string;
  timings: Record<string, number>;
};

/** Visible only when TIMING_DEBUG=1 (or true). Safe for Cambodia remote tests. */
export function TimingBadge({ route, timings }: TimingBadgeProps) {
  const enabled =
    process.env.TIMING_DEBUG === "1" || process.env.TIMING_DEBUG === "true";

  if (!enabled) {
    return null;
  }

  const parts = Object.entries(timings)
    .map(([key, value]) => `${key}=${value}ms`)
    .join(" · ");

  return (
    <div className="mb-4 rounded-md border border-amber-500/40 bg-amber-500/10 px-3 py-2 font-mono text-xs text-amber-900 dark:text-amber-100">
      <div className="font-semibold">timing · {route}</div>
      <div>{parts}</div>
    </div>
  );
}
