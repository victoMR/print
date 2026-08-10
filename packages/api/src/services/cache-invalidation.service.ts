import { cacheDel, cacheDelByPattern } from '../lib/cache.js';
import { catalogPattern, catalogProductKey, fxKey } from '../lib/cache-keys.js';
import { clearFxCacheLocal } from '../lib/banxico.js';
import { logger } from '../lib/logger.js';

/** Invalida listados y detalle de catálogo tras mutaciones admin. */
export async function invalidateCatalogCache(productSlug?: string): Promise<void> {
  const deleted = await cacheDelByPattern(catalogPattern());
  if (productSlug) {
    await cacheDel(catalogProductKey(productSlug, 'mx'));
    await cacheDel(catalogProductKey(productSlug, 'us'));
  }
  logger.info({ deleted, productSlug }, 'Catálogo cache invalidado');
}

/** Invalida tipo de cambio (Redis + memoria local). */
export async function invalidateFxCache(): Promise<void> {
  clearFxCacheLocal();
  await cacheDel(fxKey());
}
