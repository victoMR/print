export type Market = 'mx' | 'us';

const COUNTRY_MARKET: Record<string, Market> = {
  US: 'us',
  MX: 'mx',
};

export function marketFromCountry(country: string | null | undefined): Market | null {
  if (!country) return null;
  return COUNTRY_MARKET[country.toUpperCase()] ?? null;
}

export function marketForCurrency(currency: 'MXN' | 'USD'): Market {
  return currency === 'USD' ? 'us' : 'mx';
}
