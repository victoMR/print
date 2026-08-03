import type { Locale } from "./locale";

export type OrderCurrency = "MXN" | "USD";

/** El mercado decide la moneda mostrada/cobrada: us -> USD, mx -> MXN. */
export function currencyForLocale(locale: Locale): OrderCurrency {
  return locale === "us" ? "USD" : "MXN";
}

/** null si el producto/variante no tiene precio en la moneda solicitada todavía. */
export function priceForCurrency(
  item: { retailPriceMxn: string; retailPriceUsd?: string | null },
  currency: OrderCurrency,
): string | null {
  if (currency === "USD") return item.retailPriceUsd ?? null;
  return item.retailPriceMxn;
}
