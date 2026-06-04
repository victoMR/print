import { createHash } from 'node:crypto';
import { getRedisConnection, isRedisReady } from './queue.js';
import { logger } from './logger.js';

export interface CacheStats {
  hits: number;
  misses: number;
}

const stats: CacheStats = { hits: 0, misses: 0 };

export function getCacheStats(): Readonly<CacheStats> {
  return stats;
}

export function resetCacheStats(): void {
  stats.hits = 0;
  stats.misses = 0;
}

/** Hash estable para payloads de cache (envío, etc.). */
export function stableHash(payload: unknown): string {
  return createHash('sha256').update(JSON.stringify(payload)).digest('hex').slice(0, 32);
}

export async function cacheGet<T>(key: string): Promise<T | null> {
  const redis = getRedisConnection();
  if (!isRedisReady() || !redis) return null;

  try {
    const raw = await redis.get(key);
    if (raw === null) {
      stats.misses += 1;
      return null;
    }
    stats.hits += 1;
    return JSON.parse(raw) as T;
  } catch (err) {
    logger.warn({ err, key }, 'Redis cache get failed');
    return null;
  }
}

export async function cacheSet(key: string, value: unknown, ttlSeconds: number): Promise<void> {
  const redis = getRedisConnection();
  if (!isRedisReady() || !redis || ttlSeconds <= 0) return;

  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
  } catch (err) {
    logger.warn({ err, key }, 'Redis cache set failed');
  }
}

export async function cacheDel(key: string): Promise<void> {
  const redis = getRedisConnection();
  if (!isRedisReady() || !redis) return;

  try {
    await redis.del(key);
  } catch (err) {
    logger.warn({ err, key }, 'Redis cache del failed');
  }
}

/** Elimina claves por patrón SCAN (ej. `mrpaps:catalog:*`). */
export async function cacheDelByPattern(pattern: string): Promise<number> {
  const redis = getRedisConnection();
  if (!isRedisReady() || !redis) return 0;

  let deleted = 0;
  let cursor = '0';

  try {
    do {
      const [nextCursor, keys] = await redis.scan(cursor, 'MATCH', pattern, 'COUNT', 100);
      cursor = nextCursor;
      if (keys.length > 0) {
        deleted += await redis.del(...keys);
      }
    } while (cursor !== '0');
  } catch (err) {
    logger.warn({ err, pattern }, 'Redis cache pattern delete failed');
  }

  return deleted;
}

/**
 * Cache-aside: lee Redis; si miss, ejecuta `loader` y guarda resultado.
 * Sin Redis → ejecuta `loader` directamente (degradación graceful).
 */
export async function wrapCache<T>(
  key: string,
  ttlSeconds: number,
  loader: () => Promise<T>,
): Promise<T> {
  const cached = await cacheGet<T>(key);
  if (cached !== null) {
    return cached;
  }

  const value = await loader();
  await cacheSet(key, value, ttlSeconds);
  return value;
}
