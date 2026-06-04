import type { CreateOrderBody, EstimateBody, ShippingRatesBody } from '../schemas/api.schema.js';
import * as mrpapsCheckout from './mrpaps-checkout.service.js';

/** Adaptador v1 checkout → almacenamiento local Mr. Paps (sin Printful). */

function mapShippingItems(
  items: ShippingRatesBody['items'],
): Array<{ variantId: string; quantity: number }> {
  return items.map((item) => {
    const variantId = item.variantId?.trim();
    if (!variantId || !/^[0-9a-f-]{36}$/i.test(variantId)) {
      throw new Error('variantId inválido. Vacía el carrito y vuelve a agregar productos desde /shop.');
    }
    return { variantId, quantity: item.quantity };
  });
}

function mapPricedItems(
  items: Array<{ variantId?: string; quantity: number; retailPriceMxn: string }>,
): Array<{ variantId: string; quantity: number; retailPriceMxn: string }> {
  return items.map((item) => {
    const variantId = item.variantId?.trim();
    if (!variantId || !/^[0-9a-f-]{36}$/i.test(variantId)) {
      throw new Error('variantId inválido. Vacía el carrito y vuelve a agregar productos desde /shop.');
    }
    return { variantId, quantity: item.quantity, retailPriceMxn: item.retailPriceMxn };
  });
}

export async function getShippingRatesMxn(input: ShippingRatesBody) {
  return mrpapsCheckout.getShippingRates({
    items: mapShippingItems(input.items),
    address: input.address,
  });
}

export async function estimateCostsMxn(input: EstimateBody) {
  return mrpapsCheckout.estimateCosts({
    items: mapPricedItems(input.items),
    address: input.address,
  });
}

export async function createDraftOrderPublic(body: CreateOrderBody, customerUserId?: string) {
  return mrpapsCheckout.createOrder({
    items: mapPricedItems(body.items),
    recipient: body.recipient,
    retailCosts: body.retailCosts,
    saveAccount: (body as CreateOrderBody & { saveAccount?: boolean }).saveAccount,
    customerUserId,
  });
}

export async function getPublicOrder(trackingCode: string, email: string) {
  return mrpapsCheckout.getPublicOrder(trackingCode, email);
}

export async function finalizeOrderPaymentPublic(publicOrderId: string) {
  const { finalizeOrderPayment } = await import('./mrpaps-order-payment-finalize.service.js');
  return finalizeOrderPayment(publicOrderId);
}
