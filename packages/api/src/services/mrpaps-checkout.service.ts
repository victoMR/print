import { randomUUID } from 'node:crypto';
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
  getShippingLabel,
  getShippingRates as fetchShippingRates,
  resolveShippingPriceMxn,
} from './mrpaps-shipping.service.js';
import { BadRequestError } from '../types/errors.js';
import { getOrderDetail } from './mrpaps-order-detail.service.js';

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

export async function estimateCosts(input: MrpapsEstimateBody) {
  const lines = await catalog.resolveLineItems(input.items);
  const subtotal = lines.reduce((sum, l) => sum + l.unitPriceMxn * l.quantity, 0);
  const shipping = await resolveShippingPriceMxn(
    { items: input.items, address: input.address },
    input.shippingMethod,
    true,
  );
  const totals = computeRetailTotals(subtotal, shipping);

  return {
    currency: 'MXN' as const,
    ...totals,
    shippingMethod: input.shippingMethod,
  };
}

export async function createOrder(body: MrpapsCreateOrderBody) {
  const lines = await catalog.resolveLineItems(body.items);
  const subtotal = lines.reduce((sum, l) => sum + l.unitPriceMxn * l.quantity, 0);
  const shippingInput = {
    items: body.items,
    address: addressFromRecipient(body.recipient),
  };
  const shipping = await resolveShippingPriceMxn(
    shippingInput,
    body.shippingMethod,
    true,
  );
  const expected = computeRetailTotals(subtotal, shipping);

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

  const publicId = randomUUID().replace(/-/g, '');
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
    shipping_method: body.shippingMethod,
    shipping_label: await getShippingLabel(shippingInput, body.shippingMethod),
    subtotal_mxn: Number(expected.subtotal),
    shipping_mxn: Number(expected.shipping),
    tax_mxn: Number(expected.tax),
    total_mxn: Number(expected.total),
    items: orderItems,
  });

  return {
    internalOrderId: order.public_id,
    orderNumber: order.order_number,
    status: order.status,
    paymentClientSecret: null as string | null,
  };
}

export async function getPublicOrder(publicId: string) {
  return getOrderDetail(publicId);
}
