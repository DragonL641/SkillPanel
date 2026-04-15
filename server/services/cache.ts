interface CacheEntry<T> { data: T; expiry: number; }
const cache = new Map<string, CacheEntry<any>>();
const DEFAULT_TTL = 5_000; // 5 seconds

export function getOrCompute<T>(key: string, compute: () => T, ttl = DEFAULT_TTL): T {
  const entry = cache.get(key);
  if (entry && Date.now() < entry.expiry) return entry.data;
  const data = compute();
  cache.set(key, { data, expiry: Date.now() + ttl });
  return data;
}

export function invalidate(key?: string): void {
  if (key) cache.delete(key);
  else cache.clear();
}

export function invalidateByPrefix(prefix: string): void {
  for (const key of cache.keys()) {
    if (key.startsWith(prefix)) cache.delete(key);
  }
}

export function cacheSize(): number {
  return cache.size;
}
