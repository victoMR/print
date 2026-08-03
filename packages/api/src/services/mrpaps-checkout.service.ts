import type {
  MrpapsCreateOrderBody,
  MrpapsEstimateBody,
  MrpapsShippingRatesBody,
} from '../schemas/mrpaps.schema.js';
import * as catalog from './mrpaps-catalog.service.js';
import * as ordersRepo from '../db/mrpaps-orders.repository.js';
import * as usersRepo from '../db/mrpaps-users.repository.js';
import { resolvePrintFileUrl } from './mrpaps-print.service.js';
import {
  getShippingRates as fetchShippingRates,
  resolveAutoShippingMxn,
} from './mrpaps-shipping.service.js';
import { resolveUsdShipping } from './shipping/usd-shipping-rates.js';
import { BadRequestError, MarketMismatchError } from '../types/errors.js';
import { getGuestOrderByCodeAndEmail } from './mrpaps-order-tracking.service.js';
import { LEGAL_VERSION } from './email-verification.service.js';
import { marketForCurrency, type Market } from '../lib/market.js';

type OrderCurrency = 'MXN' | 'USD';

/**
 * Hard block only on a CONFIRMED mismatch (verifiedMarket is non-null and
 * disagrees with the order's currency) — never on inconclusive geolocation
 * (verifiedMarket === null), since a real customer shouldn't be blocked by an
 * external geo-IP service hiccup. Shipping is Mexico-only for both markets
 * today, which already narrows the real-world abuse window this closes.
 */
function assertMarketMatchesCurrency(currency: OrderCurrency, verifiedMarket?: Market | null): void {
  if (!verifiedMarket) return;
  const expectedMarket = marketForCurrency(currency);
  if (verifiedMarket !== expectedMarket) {
    throw new MarketMismatchError(
      'La moneda de tu pedido no coincide con tu ubicación detectada. Cambia a la versión correcta del sitio (/mx o /us) para continuar.',
      verifiedMarket,
    );
  }
}

function addressFromRecipient(recipient: MrpapsCreateOrderBody['recipient']) {
  return {
    address1: recipient.address1,
    address2: recipient.address2,
    city: recipient.city,
    stateCode: recipient.stateCode,
    countryCode: recipient.countryCode,
    zip: recipient.zip,
  };
}

const IVA_RATE_MXN = 0.16;

/**
 * Tasa de IVA para órdenes en USD — configurable (no hardcodeada) porque el
 * trato fiscal correcto (¿16% normal o 0% por exportación?) depende de una
 * decisión de negocio/contable pendiente. Por defecto igual a MXN hasta que
 * se defina lo contrario.
 */
function getIvaRateUsd(): number {
  const raw = process.env.IVA_RATE_USD;
  if (!raw) return IVA_RATE_MXN;
  const parsed = Number.parseFloat(raw);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : IVA_RATE_MXN;
}

function ivaRateFor(currency: OrderCurrency): number {
  return currency === 'USD' ? getIvaRateUsd() : IVA_RATE_MXN;
}

function computeRetailTotals(subtotal: number, shipping: number, ivaRate: number) {
  // Round each intermediate value to 2 decimal places using integer (cent) arithmetic
  // to prevent float drift that would cause valid orders to be rejected with "totals don't match".
  const subtotalCents = Math.round(subtotal * 100);
  const shippingCents = Math.round(shipping * 100);
  const taxCents = Math.round((subtotalCents + shippingCents) * ivaRate);
  const totalCents = subtotalCents + shippingCents + taxCents;
  return {
    subtotal: (subtotalCents / 100).toFixed(2),
    shipping: (shippingCents / 100).toFixed(2),
    tax: (taxCents / 100).toFixed(2),
    total: (totalCents / 100).toFixed(2),
  };
}

export async function getShippingRates(input: MrpapsShippingRatesBody) {
  await catalog.resolveLineItems(input.items);
  return fetchShippingRates(input);
}

type EstimateInput = {
  items: MrpapsEstimateBody['items'];
  address: MrpapsShippingRatesBody['address'];
  currency?: OrderCurrency;
};

export async function estimateCosts(input: EstimateInput) {
  const currency: OrderCurrency = input.currency ?? 'MXN';
  const lines = await catalog.resolveLineItems(input.items, currency);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  let shippingPrice: number;
  let shippingMethod: string;

  if (currency === 'USD') {
    const flat = resolveUsdShipping(itemCount);
    shippingPrice = flat.priceUsd;
    shippingMethod = flat.method;
    const subtotal = lines.reduce((sum, l) => sum + (l.unitPriceUsd ?? 0) * l.quantity, 0);
    const totals = computeRetailTotals(subtotal, shippingPrice, ivaRateFor(currency));
    return { currency, ...totals, shippingMethod };
  }

  const auto = await resolveAutoShippingMxn({ items: input.items, address: input.address });
  shippingPrice = auto.priceMxn;
  shippingMethod = auto.method;
  const subtotal = lines.reduce((sum, l) => sum + l.unitPriceMxn * l.quantity, 0);
  const totals = computeRetailTotals(subtotal, shippingPrice, ivaRateFor(currency));

  return { currency, ...totals, shippingMethod };
}

export async function createOrder(body: MrpapsCreateOrderBody, verifiedMarket?: Market | null) {
  const now = new Date().toISOString();

  if (body.customerUserId) {
    const account = await usersRepo.findUserById(body.customerUserId);
    if (!account || account.role !== 'customer') {
      throw new BadRequestError('Sesión de cliente no válida');
    }
    if (!account.email_verified_at) {
      throw new BadRequestError('Verifica tu correo antes de realizar un pedido.');
    }
    if (!account.terms_accepted_at || !account.privacy_accepted_at) {
      throw new BadRequestError('Debes aceptar los Términos y el Aviso de Privacidad en tu cuenta.');
    }
  } else if (!body.acceptedLegal) {
    throw new BadRequestError('Debes aceptar los Términos y Condiciones y el Aviso de Privacidad para continuar.');
  }

  const currency: OrderCurrency = body.retailCosts.currency;
  assertMarketMatchesCurrency(currency, verifiedMarket);
  const lines = await catalog.resolveLineItems(body.items, currency);
  const itemCount = lines.reduce((sum, l) => sum + l.quantity, 0);

  let shippingPriceMxn = 0;
  let shippingPriceUsd = 0;
  let shippingMethod: string;
  let shippingLabel: string | undefined;
  let subtotal: number;

  if (currency === 'USD') {
    const flat = resolveUsdShipping(itemCount);
    shippingPriceUsd = flat.priceUsd;
    shippingMethod = flat.method;
    shippingLabel = flat.label;
    subtotal = lines.reduce((sum, l) => sum + (l.unitPriceUsd ?? 0) * l.quantity, 0);
  } else {
    const shippingInput = { items: body.items, address: addressFromRecipient(body.recipient) };
    // Tarifa más barata automática; ignore client-supplied shippingMethod
    const auto = await resolveAutoShippingMxn(shippingInput);
    shippingPriceMxn = auto.priceMxn;
    shippingMethod = auto.method;
    shippingLabel = auto.label;
    subtotal = lines.reduce((sum, l) => sum + l.unitPriceMxn * l.quantity, 0);
  }

  const expected = computeRetailTotals(
    subtotal,
    currency === 'USD' ? shippingPriceUsd : shippingPriceMxn,
    ivaRateFor(currency),
  );

  if (
    body.retailCosts.subtotal !== expected.subtotal ||
    body.retailCosts.shipping !== expected.shipping ||
    body.retailCosts.tax !== expected.tax ||
    body.retailCosts.total !== expected.total
  ) {
    throw new BadRequestError('Los totales no coinciden. Vuelve a cotizar el pedido.');
  }

  let userId: string | null = null;

  if (body.customerUserId) {
    userId = body.customerUserId;
  } else if (body.saveAccount) {
    const user = await usersRepo.upsertUserByEmail({
      email: body.recipient.email,
      full_name: body.recipient.name,
      phone: body.recipient.phone,
      tax_number: body.recipient.taxNumber ?? null,
    });
    userId = user.id;

    if (body.acceptedLegal) {
      await usersRepo.recordLegalAcceptance(user.id, LEGAL_VERSION);
    }

    await usersRepo.saveAddress({
      user_id: user.id,
      label: 'Último pedido',
      recipient_name: body.recipient.name,
      phone: body.recipient.phone,
      address1: body.recipient.address1,
      address2: body.recipient.address2 ?? null,
      city: body.recipient.city,
      state_code: body.recipient.stateCode,
      country_code: body.recipient.countryCode,
      zip: body.recipient.zip,
      is_default: true,
    });
  }

  const publicId = await ordersRepo.reserveUniquePublicId();
  const orderNumber = await ordersRepo.generateOrderNumber();

  const orderItems = await Promise.all(
    lines.map(async (line) => {
      const printFileUrl = await resolvePrintFileUrl(line.variant.product, line.variant);

      return {
        variant_id: line.variant.id,
        design_id: line.variant.design_id,
        quantity: line.quantity,
        unit_price_mxn: line.unitPriceMxn,
        unit_price_usd: line.unitPriceUsd,
        product_name: line.variant.product.name,
        variant_label: `${line.variant.color_label} / ${line.variant.size_label}`,
        sku: line.variant.sku,
        thumbnail_url: line.variant.product.thumbnail_url,
        print_file_url: printFileUrl,
      };
    }),
  );

  // Lazy cleanup: releases stock held by abandoned orders before checking availability.
  ordersRepo.releaseExpiredOrderReservations().catch(() => undefined);

  const order = await ordersRepo.createOrder({
    public_id: publicId,
    order_number: orderNumber,
    user_id: userId,
    terms_accepted_at: body.customerUserId || body.acceptedLegal ? now : null,
    legal_accepted_version: body.customerUserId || body.acceptedLegal ? LEGAL_VERSION : null,
    customer_name: body.recipient.name,
    customer_email: body.recipient.email.toLowerCase(),
    customer_phone: body.recipient.phone,
    customer_tax_number: body.recipient.taxNumber ?? null,
    ship_address1: body.recipient.address1,
    ship_address2: body.recipient.address2 ?? null,
    ship_city: body.recipient.city,
    ship_state_code: body.recipient.stateCode,
    ship_country_code: body.recipient.countryCode,
    ship_zip: body.recipient.zip,
    shipping_method: shippingMethod,
    shipping_label: shippingLabel,
    currency,
    // Solo se guarda el lado de la moneda cobrada; el equivalente MXN real
    // para una orden en USD se llena después vía webhook con el dato de
    // liquidación de Stripe (stripe_settlement_amount_mxn), no estimado aquí.
    subtotal_mxn: currency === 'MXN' ? Number(expected.subtotal) : null,
    shipping_mxn: currency === 'MXN' ? Number(expected.shipping) : null,
    tax_mxn: currency === 'MXN' ? Number(expected.tax) : null,
    total_mxn: currency === 'MXN' ? Number(expected.total) : null,
    subtotal_usd: currency === 'USD' ? Number(expected.subtotal) : null,
    shipping_usd: currency === 'USD' ? Number(expected.shipping) : null,
    tax_usd: currency === 'USD' ? Number(expected.tax) : null,
    total_usd: currency === 'USD' ? Number(expected.total) : null,
    items: orderItems,
  });

  return {
    internalOrderId: order.public_id,
    trackingCode: order.public_id,
    orderNumber: order.order_number,
    status: order.status,
    paymentClientSecret: null as string | null,
  };
}

export async function getPublicOrder(trackingCode: string, email: string) {
  return getGuestOrderByCodeAndEmail(trackingCode, email);
}
