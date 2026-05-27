import { logger } from './logger.js';

const CACHE_TTL_MS = 4 * 60 * 60 * 1000; // 4 hours
const FX_BUFFER = 1.05; // 5% cushion per project rules

interface FxCache {
  rate: number;
  fetchedAt: number;
}

let cache: FxCache | null = null;

/** Stub FIX rate — replace with Banxico SieAPI when BANXICO_API_TOKEN is set. */
const STUB_USD_MXN = 17.5;

/**
 * Returns USD→MXN rate with 5% buffer applied (for retail pricing).
 */
export async function getUsdToMxnRate(): Promise<number> {
  const now = Date.now();
  if (cache && now - cache.fetchedAt < CACHE_TTL_MS) {
    return cache.rate;
  }

  let baseRate = STUB_USD_MXN;

  if (process.env.BANXICO_API_TOKEN) {
    try {
      baseRate = await fetchBanxicoFix();
    } catch (err) {
      logger.warn({ err }, 'Banxico fetch failed; using stub rate');
    }
  } else {
    logger.debug('BANXICO_API_TOKEN not set; using stub FX rate');
  }

  const rate = baseRate * FX_BUFFER;
  cache = { rate, fetchedAt: now };
  return rate;
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

export function clearFxCache(): void {
  cache = null;
}
