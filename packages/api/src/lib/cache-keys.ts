/** Prefijo global para todas las claves Redis de la app. */
export const CACHE_PREFIX = 'mrpaps:';

function envSeconds(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const n = Number.parseInt(raw, 10);
  return Number.isFinite(n) && n > 0 ? n : fallback;
}

/** TTLs en segundos — configurables vía .env */
export const CacheTTL = {
  catalogList: () => envSeconds('CACHE_TTL_CATALOG_LIST_SEC', 300),
  catalogProduct: () => envSeconds('CACHE_TTL_CATALOG_PRODUCT_SEC', 600),
  fx: () => envSeconds('CACHE_TTL_FX_SEC', 14_400),
  shipping: () => envSeconds('CACHE_TTL_SHIPPING_SEC', 900),
} as const;

export function catalogListKey(
  category: string | undefined,
  search: string | undefined,
  page: number,
  limit: number,
): string {
  const cat = category ?? '_';
  const q = (search ?? '_').toLowerCase().slice(0, 120);
  return `${CACHE_PREFIX}catalog:list:${cat}:${q}:${page}:${limit}`;
}

export function catalogProductKey(idOrSlug: string): string {
  return `${CACHE_PREFIX}catalog:product:${idOrSlug.toLowerCase()}`;
}

export function catalogPattern(): string {
  return `${CACHE_PREFIX}catalog:*`;
}

export function fxKey(): string {
  return `${CACHE_PREFIX}fx:usd-mxn`;
}

export function shippingQuoteKey(contentHash: string, forCustomer: boolean): string {
  return `${CACHE_PREFIX}shipping:quote:${forCustomer ? 'cust' : 'cost'}:${contentHash}`;
}

export function printfulRateLimitKey(): string {
  return `${CACHE_PREFIX}printful:ratelimit:global`;
}
