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
    shippingMethod: input.shippingMethod as 'STANDARD' | 'EXPRESS',
    address: input.address,
  });
}

export async function createDraftOrderPublic(body: CreateOrderBody) {
  return mrpapsCheckout.createOrder({
    items: mapPricedItems(body.items),
    shippingMethod: body.shippingMethod as 'STANDARD' | 'EXPRESS',
    recipient: body.recipient,
    retailCosts: body.retailCosts,
    saveAccount: (body as CreateOrderBody & { saveAccount?: boolean }).saveAccount,
  });
}

export async function getPublicOrder(internalOrderId: string) {
  return mrpapsCheckout.getPublicOrder(internalOrderId);
}
