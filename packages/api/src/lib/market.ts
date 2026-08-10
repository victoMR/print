export type Market = 'mx' | 'us';
export type ShipCountry = 'MX' | 'US';

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

/** País de envío permitido para la moneda del pedido / tienda. */
export function countryForCurrency(currency: 'MXN' | 'USD'): ShipCountry {
  return currency === 'USD' ? 'US' : 'MX';
}

export function currencyForCountry(country: ShipCountry): 'MXN' | 'USD' {
  return country === 'US' ? 'USD' : 'MXN';
}

/** Stock físico de la variante en el mercado dado — MX y US se rastrean por separado. */
export function stockForMarket(
  variant: { stock_quantity_mx: number; stock_quantity_us: number },
  market: Market,
): number {
  return market === 'us' ? variant.stock_quantity_us : variant.stock_quantity_mx;
}
