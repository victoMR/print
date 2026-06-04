import { printfulRateLimitKey } from './cache-keys.js';
import { getRedisConnection, isRedisReady } from './queue.js';
import { logger } from './logger.js';
import { RateLimitError } from '../types/errors.js';

/** Límite global Printful: 120 req/min (.cursorrules). */
const PRINTFUL_LIMIT = Number.parseInt(process.env.PRINTFUL_RATE_LIMIT_PER_MIN ?? '120', 10);
const WINDOW_SEC = 60;

/**
 * Throttle proactivo antes de llamar a Printful.
 * Sin Redis → no-op (axios-retry sigue manejando 429 reactivos).
 */
export async function acquirePrintfulRateLimit(): Promise<void> {
  const redis = getRedisConnection();
  if (!isRedisReady() || !redis) return;

  const key = printfulRateLimitKey();

  try {
    const count = await redis.incr(key);
    if (count === 1) {
      await redis.expire(key, WINDOW_SEC);
    }

    if (count > PRINTFUL_LIMIT) {
      logger.warn({ count, limit: PRINTFUL_LIMIT }, 'Printful local rate limit reached');
      throw new RateLimitError(
        'Límite local de Printful alcanzado; reintenta en unos segundos',
      );
    }
  } catch (err) {
    if (err instanceof RateLimitError) throw err;
    logger.warn({ err }, 'Printful rate limit check failed; proceeding without throttle');
  }
}
