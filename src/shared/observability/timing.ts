type TimingMarks = Record<string, number>;

export function createTimer(label: string) {
  const startedAt = performance.now();
  const marks: TimingMarks = {};

  return {
    mark(name: string) {
      marks[name] = Math.round(performance.now() - startedAt);
    },
    /** Elapsed ms since timer start (or since last mark if relativeTo provided). */
    ms(relativeTo?: string) {
      const now = performance.now();
      const base = relativeTo != null ? startedAt + (marks[relativeTo] ?? 0) : startedAt;
      return Math.round(now - base);
    },
    /** Total elapsed ms since createTimer(). */
    total() {
      return Math.round(performance.now() - startedAt);
    },
    marks() {
      return { ...marks, total: Math.round(performance.now() - startedAt) };
    },
    log(extra?: Record<string, string | number | boolean | null | undefined>) {
      const payload: Record<string, string | number | boolean | null | undefined> = {
        label,
        ...marks,
        totalMs: Math.round(performance.now() - startedAt),
        ...extra,
      };
      console.info("[timing]", payload);
      return payload;
    },
  };
}

export async function timeAsync<T>(
  name: string,
  fn: () => Promise<T>,
): Promise<{ result: T; ms: number }> {
  const startedAt = performance.now();
  const result = await fn();
  return { result, ms: Math.round(performance.now() - startedAt) };
}
