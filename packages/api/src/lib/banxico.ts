import { CacheTTL, fxKey } from './cache-keys.js';
import { cacheDel, wrapCache } from './cache.js';
import { logger } from './logger.js';

const FX_BUFFER = 1.05; // 5% cushion per project rules

interface FxCache {
  rate: number;
  fetchedAt: number;
}

/** Fallback in-memory cuando Redis no está disponible. */
let localCache: FxCache | null = null;

/** Stub FIX rate — replace with Banxico SieAPI when BANXICO_API_TOKEN is set. */
const STUB_USD_MXN = 17.5;

async function fetchBaseUsdMxnRate(): Promise<number> {
  if (process.env.BANXICO_API_TOKEN) {
    try {
      return await fetchBanxicoFix();
    } catch (err) {
      logger.warn({ err }, 'Banxico fetch failed; using stub rate');
    }
  } else {
    logger.debug('BANXICO_API_TOKEN not set; using stub FX rate');
  }
  return STUB_USD_MXN;
}

/**
 * Returns USD→MXN rate with 5% buffer applied (for retail pricing).
 * Redis (4 h TTL) → memoria local → Banxico API.
 */
export async function getUsdToMxnRate(): Promise<number> {
  const ttlSec = CacheTTL.fx();
  const now = Date.now();

  if (localCache && now - localCache.fetchedAt < ttlSec * 1000) {
    return localCache.rate;
  }

  const result = await wrapCache<{ rate: number; fetchedAt: number }>(
    fxKey(),
    ttlSec,
    async () => {
      const baseRate = await fetchBaseUsdMxnRate();
      return { rate: baseRate * FX_BUFFER, fetchedAt: Date.now() };
    },
  );

  localCache = result;
  return result.rate;
}

/** Converts USD amount to MXN string with 2 decimals. */
export async function usdToMxn(usd: number): Promise<string> {
  const rate = await getUsdToMxnRate();
  return (usd * rate).toFixed(2);
}

async function fetchBanxicoFix(): Promise<number> {
  const token = process.env.BANXICO_API_TOKEN!;
  const series = 'SF43718'; // FIX USD
  const url = `https://www.banxico.org.mx/SieAPIRest/service/v1/series/${series}/datos/oportuno`;

  const res = await fetch(url, {
    headers: { 'Bmx-Token': token, Accept: 'application/json' },
  });

  if (!res.ok) {
    throw new Error(`Banxico API error: ${res.status}`);
  }

  const json = (await res.json()) as {
    bmx?: { series?: Array<{ datos?: Array<{ dato?: string }> }> };
  };
  const dato = json.bmx?.series?.[0]?.datos?.[0]?.dato;
  if (!dato) {
    throw new Error('Banxico response missing FIX datum');
  }

  return parseFloat(dato.replace(/,/g, ''));
}

export function clearFxCacheLocal(): void {
  localCache = null;
}

/** Limpia FX en memoria y Redis. */
export async function clearFxCache(): Promise<void> {
  clearFxCacheLocal();
  await cacheDel(fxKey());
}
