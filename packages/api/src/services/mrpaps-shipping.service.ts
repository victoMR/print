import type { MrpapsShippingRatesBody } from '../schemas/mrpaps.schema.js';
import {
  getLocalShippingPriceMxn,
  getShippingLabelFromRates,
  quoteShipping,
} from './shipping/shipping-quote.service.js';

export { quoteShipping, resolveShippingPriceMxn, resolveAutoShippingMxn } from './shipping/shipping-quote.service.js';
export type { ShippingQuoteRate, ShippingQuoteResult } from './shipping/shipping-quote.types.js';

export async function getShippingRates(input: MrpapsShippingRatesBody) {
  const result = await quoteShipping(input, { forCustomer: true });
  return {
    rates: result.rates.map(({ id, name, priceMxn, minDays, maxDays, carrier, source, estimated }) => ({
      id,
      name,
      priceMxn,
      minDays,
      maxDays,
      carrier,
      source,
      estimated,
    })),
    provider: result.provider,
    meta: result.meta,
  };
}

export async function getShippingLabel(
  input: MrpapsShippingRatesBody,
  method: string,
): Promise<string> {
  const { rates } = await quoteShipping(input, { forCustomer: false });
  return getShippingLabelFromRates(rates, method);
}

/** @deprecated Usar resolveShippingPriceMxn con dirección completa. */
export function getShippingPriceMxn(method: string, itemCount: number): number {
  return getLocalShippingPriceMxn(method, itemCount);
}
