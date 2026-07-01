/**
 * Server-side In-Memory Cache for Destiny Reports
 * - LRU eviction when exceeding MAX_ENTRIES
 * - TTL-based expiration (24 hours)
 * - Cache key = hash of (name + dob + time + gender + locale)
 */

const MAX_ENTRIES = 1000;
const TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

interface CacheEntry {
  data: any;
  createdAt: number;
}

// Using a Map preserves insertion order, enabling simple LRU eviction
const cache = new Map<string, CacheEntry>();

/**
 * Generate a simple but collision-resistant hash key from input parameters.
 * We avoid importing crypto on the edge by using a fast string hash.
 */
export function generateCacheKey(params: {
  name: string;
  dob: string;
  time?: string;
  country?: string;
  city?: string;
  gender: string;
  locale: string;
}): string {
  const raw = `${params.name}|${params.dob}|${params.time || "unknown"}|${params.country || "unknown"}|${params.city || "unknown"}|${params.gender}|${params.locale}`.toLowerCase();
  // Simple djb2 hash — fast, deterministic, good distribution
  let hash = 5381;
  for (let i = 0; i < raw.length; i++) {
    hash = ((hash << 5) + hash + raw.charCodeAt(i)) >>> 0;
  }
  return `destiny_${hash.toString(36)}`;
}

/**
 * Retrieve a cached result. Returns null if not found or expired.
 */
export function getCachedResult(key: string): any | null {
  const entry = cache.get(key);
  if (!entry) return null;

  // Check TTL expiration
  if (Date.now() - entry.createdAt > TTL_MS) {
    cache.delete(key);
    return null;
  }

  // Move to end of Map (most recently used) for LRU
  cache.delete(key);
  cache.set(key, entry);

  return entry.data;
}

/**
 * Store a result in the cache. Evicts oldest entry if over capacity.
 */
export function setCachedResult(key: string, data: any): void {
  // Evict oldest entries if at capacity
  while (cache.size >= MAX_ENTRIES) {
    const oldestKey = cache.keys().next().value;
    if (oldestKey) cache.delete(oldestKey);
  }

  cache.set(key, {
    data,
    createdAt: Date.now(),
  });
}

/**
 * Get cache stats for monitoring
 */
export function getCacheStats() {
  return {
    size: cache.size,
    maxSize: MAX_ENTRIES,
    ttlHours: TTL_MS / (60 * 60 * 1000),
  };
}
