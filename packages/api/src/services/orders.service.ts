import { printful } from '../lib/printful.js';
import type { PrintfulOrder } from '../types/printful.types.js';
import type { OrderInputType } from '../schemas/order.schema.js';
import { callPrintful } from './printful.helper.js';
import * as ordersRepo from '../db/orders.repository.js';
import type { Json } from '../db/types.js';

/**
 * Crea pedido en Printful como DRAFT (sin confirmar).
 * Golden Rule: nunca usar ?confirm=1 en la creación inicial.
 */
export async function createDraftOrder(input: OrderInputType): Promise<PrintfulOrder> {
  const payload = {
    external_id: input.external_id,
    shipping: input.shipping,
    recipient: input.recipient,
    items: input.items,
    retail_costs: input.retail_costs,
  };

  const order = await callPrintful<PrintfulOrder>(
    () => printful.post('/orders', payload),
    { operation: 'createDraftOrder', internalId: input.external_id },
  );

  await ordersRepo.insertOrder({
    internal_order_id: input.external_id,
    printful_order_id: order.id,
    customer_rfc: input.recipient.tax_number ?? null,
    status: order.status,
    total_mxn: input.retail_costs.total,
    shipping_method: input.shipping,
    raw_payload: order as unknown as Json,
  });

  return order;
}

export async function getOrder(idOrExternal: string | number): Promise<PrintfulOrder> {
  const path = typeof idOrExternal === 'string' && !/^\d+$/.test(idOrExternal)
    ? `/orders/@${idOrExternal}`
    : `/orders/${idOrExternal}`;

  return callPrintful(
    () => printful.get(path),
    { operation: 'getOrder', internalId: String(idOrExternal) },
  );
}

export async function getLocalOrder(internalOrderId: string) {
  return ordersRepo.getOrderByInternalId(internalOrderId);
}

/**
 * Confirma pedido en Printful. El cobro al cliente debe ocurrir DESPUÉS de éxito aquí.
 */
export async function confirmOrder(
  printfulOrderId: number,
  internalOrderId: string,
): Promise<PrintfulOrder> {
  const order = await callPrintful<PrintfulOrder>(
    () => printful.post(`/orders/${printfulOrderId}/confirm`),
    {
      operation: 'confirmOrder',
      internalId: internalOrderId,
      printfulOrderId,
    },
  );

  await ordersRepo.updateOrderByInternalId(internalOrderId, {
    status: order.status,
    printful_order_id: order.id,
    raw_payload: order as unknown as Json,
  });

  return order;
}

export async function cancelOrder(
  printfulOrderId: number,
  internalOrderId: string,
): Promise<PrintfulOrder> {
  const order = await callPrintful<PrintfulOrder>(
    () => printful.delete(`/orders/${printfulOrderId}`),
    {
      operation: 'cancelOrder',
      internalId: internalOrderId,
      printfulOrderId,
    },
  );

  await ordersRepo.updateOrderByInternalId(internalOrderId, {
    status: order.status,
    raw_payload: order as unknown as Json,
  });

  return order;
}

export async function estimateOrderCosts(
  input: Omit<OrderInputType, 'external_id'> & { external_id?: string },
): Promise<unknown> {
  return callPrintful(
    () => printful.post('/orders/estimate-costs', input),
    { operation: 'estimateOrderCosts', internalId: input.external_id },
  );
}

export async function syncLocalOrderFromPrintful(
  printfulOrderId: number,
  order: PrintfulOrder,
  extra?: {
    tracking_number?: string | null;
    tracking_url?: string | null;
    carrier?: string | null;
    shipped_at?: string | null;
  },
): Promise<void> {
  const totalMxn =
    order.retail_costs?.total ??
    (await ordersRepo.getOrderByPrintfulId(printfulOrderId))?.total_mxn ??
    '0.00';

  await ordersRepo.upsertOrderFromPrintful(printfulOrderId, {
    internal_order_id: order.external_id,
    status: order.status,
    total_mxn: totalMxn,
    shipping_method: order.shipping,
    raw_payload: order as unknown as Json,
    ...extra,
  });
}
