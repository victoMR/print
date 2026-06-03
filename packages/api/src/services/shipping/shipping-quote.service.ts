import type { MrpapsShippingRatesBody } from '../../schemas/mrpaps.schema.js';
import { BadRequestError } from '../../types/errors.js';
import {
  getConfiguredCarriers,
  getDefaultPackage,
  getOriginFromEnv,
  isEnviaConfigured,
  quoteCarrierRates,
  type EnviaAddress,
} from './envia.client.js';
import type { ShippingQuoteRate, ShippingQuoteResult } from './shipping-quote.types.js';

const LOCAL_OPTIONS = [
  {
    id: 'STANDARD' as const,
    name: 'Envío estándar (estimado)',
    minDays: 5,
    maxDays: 14,
    baseMxn: 99,
    perItemMxn: 15,
  },
  {
    id: 'EXPRESS' as const,
    name: 'Envío express (estimado)',
    minDays: 3,
    maxDays: 7,
    baseMxn: 179,
    perItemMxn: 25,
  },
];

function localRates(itemCount: number): ShippingQuoteRate[] {
  return LOCAL_OPTIONS.map((opt) => {
    const price = opt.baseMxn + opt.perItemMxn * Math.max(0, itemCount - 1);
    return {
      id: opt.id,
      name: opt.name,
      priceMxn: price.toFixed(2),
      minDays: opt.minDays,
      maxDays: opt.maxDays,
      source: 'local',
      estimated: true,
    };
  });
}

function destinationFromBody(input: MrpapsShippingRatesBody): EnviaAddress {
  return {
    name: 'Cliente',
    phone: '+525500000000',
    street: input.address.address1,
    city: input.address.city,
    stateCode: input.address.stateCode,
    zip: input.address.zip,
  };
}

function rateId(carrier: string, service: string): string {
  return `${carrier}-${service}`.toLowerCase().replace(/[^a-z0-9]+/g, '_');
}

async function enviaRates(input: MrpapsShippingRatesBody): Promise<ShippingQuoteResult> {
  const itemCount = input.items.reduce((s, i) => s + i.quantity, 0);
  const origin = getOriginFromEnv();
  const destination = destinationFromBody(input);
  const pkg = getDefaultPackage(itemCount);
  const carriers = getConfiguredCarriers();

  const batches = await Promise.all(
    carriers.map((carrier) => quoteCarrierRates(carrier, origin, destination, pkg)),
  );

  const rates: ShippingQuoteRate[] = [];
  for (const options of batches) {
    for (const opt of options) {
      const price = Number.parseFloat(opt.totalPrice);
      if (!Number.isFinite(price) || price <= 0) continue;

      const { minDays, maxDays } = parseDeliveryEstimate(opt.deliveryEstimate);
      rates.push({
        id: rateId(opt.carrier, opt.service),
        name: `${opt.carrier.toUpperCase()} — ${opt.serviceDescription}`,
        priceMxn: price.toFixed(2),
        minDays,
        maxDays,
        carrier: opt.carrier,
        serviceCode: opt.service,
        source: 'envia',
        estimated: process.env.ENVIA_SANDBOX !== 'false',
      });
    }
  }

  rates.sort((a, b) => Number.parseFloat(a.priceMxn) - Number.parseFloat(b.priceMxn));

  return {
    rates,
    provider: 'envia',
    meta: {
      itemCount,
      weightKg: pkg.weightKg,
      originZip: origin.zip,
      destinationZip: destination.zip,
      carriersQueried: carriers,
    },
  };
}

function parseDeliveryEstimate(estimate?: string): { minDays: number; maxDays: number } {
  if (!estimate) return { minDays: 3, maxDays: 7 };
  const nums = estimate.match(/\d+/g)?.map(Number) ?? [];
  if (nums.length >= 2) return { minDays: nums[0], maxDays: nums[1] };
  if (nums.length === 1) return { minDays: nums[0], maxDays: nums[0] + 2 };
  return { minDays: 3, maxDays: 7 };
}

/** Margen al cliente en checkout (no aplica al cotizador admin). */
export function applyCustomerShippingMarkup(costMxn: number): number {
  const pct = Number(process.env.SHIPPING_CUSTOMER_MARKUP_PERCENT ?? 12);
  if (!Number.isFinite(pct) || pct <= 0) return costMxn;
  return costMxn * (1 + pct / 100);
}

export async function quoteShipping(
  input: MrpapsShippingRatesBody,
  options?: { forCustomer?: boolean },
): Promise<ShippingQuoteResult> {
  const itemCount = input.items.reduce((s, i) => s + i.quantity, 0);
  const useEnvia =
    process.env.SHIPPING_PROVIDER === 'envia' ||
    (process.env.SHIPPING_PROVIDER !== 'local' && isEnviaConfigured());

  let result: ShippingQuoteResult;

  if (useEnvia) {
    result = await enviaRates(input);
    if (result.rates.length === 0) {
      result = {
        rates: localRates(itemCount),
        provider: 'local',
        meta: {
          itemCount,
          weightKg: getDefaultPackage(itemCount).weightKg,
          originZip: getOriginFromEnv().zip,
          destinationZip: input.address.zip,
        },
      };
    }
  } else {
    result = {
      rates: localRates(itemCount),
      provider: 'local',
      meta: {
        itemCount,
        weightKg: getDefaultPackage(itemCount).weightKg,
        originZip: getOriginFromEnv().zip,
        destinationZip: input.address.zip,
      },
    };
  }

  if (options?.forCustomer) {
    result = {
      ...result,
      rates: result.rates.map((r) => ({
        ...r,
        priceMxn: applyCustomerShippingMarkup(Number.parseFloat(r.priceMxn)).toFixed(2),
      })),
    };
  }

  return result;
}

export async function resolveShippingPriceMxn(
  input: MrpapsShippingRatesBody,
  method: string,
  forCustomer = true,
): Promise<number> {
  const { rates } = await quoteShipping(input, { forCustomer });
  const match = rates.find((r) => r.id === method);
  if (!match) {
    throw new BadRequestError('Método de envío no válido o expirado. Vuelve a cotizar.');
  }
  return Number.parseFloat(match.priceMxn);
}

export function getShippingLabelFromRates(rates: ShippingQuoteRate[], method: string): string {
  return rates.find((r) => r.id === method)?.name ?? method;
}

export function getLocalShippingPriceMxn(method: string, itemCount: number): number {
  const opt = LOCAL_OPTIONS.find((o) => o.id === method) ?? LOCAL_OPTIONS[0];
  const count = Math.max(1, itemCount);
  return opt.baseMxn + opt.perItemMxn * Math.max(0, count - 1);
}
