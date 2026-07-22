type CacheEntry<T> = {
  value: T;
  expiresAt: number;
};

const store = new Map<string, CacheEntry<unknown>>();
const DEFAULT_TTL_MS = 60_000;

export function getCachedSettings<T>(tenantId: string): T | null {
  const entry = store.get(tenantId);
  if (!entry) {
    return null;
  }
  if (Date.now() > entry.expiresAt) {
    store.delete(tenantId);
    return null;
  }
  return entry.value as T;
}

export function setCachedSettings<T>(
  tenantId: string,
  value: T,
  ttlMs = DEFAULT_TTL_MS,
) {
  store.set(tenantId, { value, expiresAt: Date.now() + ttlMs });
}

export function invalidateSettingsCache(tenantId: string) {
  store.delete(tenantId);
}
