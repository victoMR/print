import { randomUUID } from 'node:crypto';
import type { CreateOrderBody, EstimateBody, ShippingRatesBody } from '../schemas/api.schema.js';
import type { OrderInputType } from '../schemas/order.schema.js';
import * as ordersService from './orders.service.js';
import * as shippingService from './shipping.service.js';
import { usdToMxn } from '../lib/banxico.js';
import type { PrintfulShippingRate } from '../types/printful.types.js';
import * as ordersRepo from '../db/orders.repository.js';
import { NotFoundError } from '../types/errors.js';

const IVA_RATE = 0.16;

function toPrintfulAddress(address: ShippingRatesBody['address']) {
  return {
    address1: address.address1,
    address2: address.address2,
    city: address.city,
    state_code: address.stateCode,
    country_code: address.countryCode,
    zip: address.zip,
  };
}

function toPrintfulRecipient(recipient: CreateOrderBody['recipient']) {
  return {
    name: recipient.name,
    address1: recipient.address1,
    address2: recipient.address2,
    city: recipient.city,
    state_code: recipient.stateCode,
    country_code: recipient.countryCode,
    zip: recipient.zip,
    phone: recipient.phone,
    email: recipient.email,
    tax_number: recipient.taxNumber,
  };
}

function toPrintfulItems(items: Array<{ syncVariantId: number; quantity: number; retailPriceMxn?: string }>) {
  return items.map((item) => ({
    sync_variant_id: item.syncVariantId,
    quantity: item.quantity,
    ...(item.retailPriceMxn && { retail_price: item.retailPriceMxn }),
  }));
}

export async function getShippingRatesMxn(input: ShippingRatesBody) {
  const contact = input.recipient ?? {
    name: 'Cliente',
    phone: '000000000000',
    email: 'checkout@print.mx',
  };

  const rates = await shippingService.getShippingRates({
    recipient: {
      ...toPrintfulAddress(input.address),
      name: contact.name,
      phone: contact.phone,
      email: contact.email,
    },
    items: toPrintfulItems(input.items),
    // Regla del proyecto: nunca mostrar precios como si fueran MXN “de Printful”.
    // Pedimos USD explícito y luego convertimos a MXN una sola vez.
    currency: 'USD',
  });

  const rateList = normalizeShippingRates(rates);

  const mapped = await Promise.all(
    rateList.map(async (rate) => ({
      id: rate.id,
      name: rate.name,
      priceMxn: await (async () => {
        const value = Number.parseFloat(rate.rate);
        if (!Number.isFinite(value) || value < 0) return '0.00';

        // Si por alguna razón Printful devolviera MXN ya convertido, no lo convirtamos otra vez.
        if (rate.currency === 'MXN') return value.toFixed(2);
        if (rate.currency === 'USD') return usdToMxn(value);

        // Evita silenciosamente resultados absurdos por moneda inesperada.
        throw new Error(`Moneda de shipping inesperada desde Printful: ${rate.currency}`);
      })(),
      minDays: rate.minDeliveryDays ?? 5,
      maxDays: rate.maxDeliveryDays ?? 14,
    })),
  );

  return { rates: mapped };
}

function normalizeShippingRates(raw: unknown): PrintfulShippingRate[] {
  if (Array.isArray(raw)) return raw as PrintfulShippingRate[];
  if (raw && typeof raw === 'object' && Array.isArray((raw as { rates?: unknown }).rates)) {
    return (raw as { rates: PrintfulShippingRate[] }).rates;
  }
  return [];
}

function computeRetailTotals(subtotal: number, shipping: number) {
  const tax = (subtotal + shipping) * IVA_RATE;
  const total = subtotal + shipping + tax;
  return {
    subtotal: subtotal.toFixed(2),
    shipping: shipping.toFixed(2),
    tax: tax.toFixed(2),
    total: total.toFixed(2),
  };
}

export async function estimateCostsMxn(input: EstimateBody) {
  const subtotal = input.items.reduce(
    (sum, item) => sum + Number.parseFloat(item.retailPriceMxn) * item.quantity,
    0,
  );

  const rates = await getShippingRatesMxn({
    items: input.items.map(({ syncVariantId, quantity }) => ({ syncVariantId, quantity })),
    address: input.address,
  });

  const selected = rates.rates.find((r) => r.id === input.shippingMethod) ?? rates.rates[0];
  const shipping = selected ? Number.parseFloat(selected.priceMxn) : 0;
  const totals = computeRetailTotals(subtotal, shipping);

  return {
    currency: 'MXN' as const,
    ...totals,
    shippingMethod: selected?.id ?? input.shippingMethod,
  };
}

function toOrderInput(body: CreateOrderBody, internalOrderId: string): OrderInputType {
  return {
    external_id: internalOrderId,
    shipping: body.shippingMethod,
    recipient: toPrintfulRecipient(body.recipient),
    items: body.items.map((item) => ({
      sync_variant_id: item.syncVariantId,
      quantity: item.quantity,
      retail_price: item.retailPriceMxn,
    })),
    retail_costs: body.retailCosts,
  };
}

export async function createDraftOrderPublic(body: CreateOrderBody) {
  // Printful valida external_id; hemos visto que UUID con guiones puede ser rechazado.
  // Usamos un UUID sin guiones (solo [a-f0-9]) para asegurar compatibilidad.
  const internalOrderId = randomUUID().replace(/-/g, '');
  await ordersService.createDraftOrder(toOrderInput(body, internalOrderId));

  return {
    internalOrderId,
    status: 'draft' as const,
    paymentClientSecret: null as string | null,
  };
}

export async function getPublicOrder(internalOrderId: string) {
  const local = await ordersRepo.getOrderByInternalId(internalOrderId);
  if (!local) {
    throw new NotFoundError('Pedido no encontrado');
  }

  return {
    internalOrderId: local.internal_order_id,
    status: local.status,
    totalMxn: Number(local.total_mxn).toFixed(2),
    trackingNumber: local.tracking_number,
    trackingUrl: local.tracking_url,
    shippedAt: local.shipped_at,
  };
}
