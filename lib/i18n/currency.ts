import type { Locale } from "./locale";

export type OrderCurrency = "MXN" | "USD";

/** El mercado (path /mx|/us) decide la moneda — nunca el idioma. */
export function currencyForMarket(market: Locale): OrderCurrency {
  return market === "us" ? "USD" : "MXN";
}

/** @deprecated Use `currencyForMarket`. */
export function currencyForLocale(locale: Locale): OrderCurrency {
  return currencyForMarket(locale);
}

/** null si el producto/variante no tiene precio en la moneda solicitada todavía. */
export function priceForCurrency(
  item: { retailPriceMxn: string; retailPriceUsd?: string | null },
  currency: OrderCurrency,
): string | null {
  if (currency === "USD") return item.retailPriceUsd ?? null;
  return item.retailPriceMxn;
}
