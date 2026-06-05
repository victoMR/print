import type {
  MrpapsCreateOrderBody,
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
import { BadRequestError } from '../types/errors.js';
import { getGuestOrderByCodeAndEmail } from './mrpaps-order-tracking.service.js';
import { LEGAL_VERSION } from './email-verification.service.js';

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

const IVA_RATE = 0.16;

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

export async function getShippingRates(input: MrpapsShippingRatesBody) {
  await catalog.resolveLineItems(input.items);
  return fetchShippingRates(input);
}

type EstimateInput = { items: MrpapsShippingRatesBody['items']; address: MrpapsShippingRatesBody['address'] };

export async function estimateCosts(input: EstimateInput) {
  const lines = await catalog.resolveLineItems(input.items);
  const subtotal = lines.reduce((sum, l) => sum + l.unitPriceMxn * l.quantity, 0);

  const auto = await resolveAutoShippingMxn({ items: input.items, address: input.address });
  const totals = computeRetailTotals(subtotal, auto.priceMxn);

  return {
    currency: 'MXN' as const,
    ...totals,
    shippingMethod: auto.method,
  };
}

export async function createOrder(body: MrpapsCreateOrderBody) {
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

  const lines = await catalog.resolveLineItems(body.items);
  const subtotal = lines.reduce((sum, l) => sum + l.unitPriceMxn * l.quantity, 0);
  const shippingInput = {
    items: body.items,
    address: addressFromRecipient(body.recipient),
  };

  // Tarifa más barata automática; ignore client-supplied shippingMethod
  const auto = await resolveAutoShippingMxn(shippingInput);
  const expected = computeRetailTotals(subtotal, auto.priceMxn);

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
        product_name: line.variant.product.name,
        variant_label: `${line.variant.color_label} / ${line.variant.size_label}`,
        sku: line.variant.sku,
        thumbnail_url: line.variant.product.thumbnail_url,
        print_file_url: printFileUrl,
      };
    }),
  );

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
    shipping_method: auto.method,
    shipping_label: auto.label,
    subtotal_mxn: Number(expected.subtotal),
    shipping_mxn: Number(expected.shipping),
    tax_mxn: Number(expected.tax),
    total_mxn: Number(expected.total),
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
