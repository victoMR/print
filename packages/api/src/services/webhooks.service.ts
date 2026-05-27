import { printful } from '../lib/printful.js';
import type { WebhookPayloadType } from '../schemas/webhook.schema.js';
import { WEBHOOK_EVENT_TYPES } from '../schemas/webhook.schema.js';
import { callPrintful } from './printful.helper.js';
import { getOrder, syncLocalOrderFromPrintful } from './orders.service.js';
import { logger } from '../lib/logger.js';
import * as webhookEventsRepo from '../db/webhook-events.repository.js';
import * as ordersRepo from '../db/orders.repository.js';
import type { Json } from '../db/types.js';

export async function registerWebhooks(): Promise<unknown> {
  const appUrl = process.env.APP_URL;
  const secret = process.env.WEBHOOK_SECRET;
  if (!appUrl || !secret) {
    throw new Error('APP_URL and WEBHOOK_SECRET are required to register webhooks');
  }

  return callPrintful(
    () => printful.post('/webhooks', {
      url: `${appUrl}/webhooks/printful/${secret}`,
      types: [...WEBHOOK_EVENT_TYPES],
    }),
    { operation: 'registerWebhooks' },
  );
}

/**
 * Procesa evento de webhook. Para acciones sensibles, re-fetch del pedido.
 */
export async function processWebhookEvent(payload: WebhookPayloadType): Promise<void> {
  const orderId = extractOrderId(payload.data);

  logger.info({
    event_type: payload.type,
    printful_order_id: orderId,
    operation: 'processWebhookEvent',
  });

  const eventRecord = await webhookEventsRepo.insertWebhookEvent({
    event_type: payload.type,
    printful_order_id: orderId ?? null,
    payload: payload as unknown as Json,
  });

  try {
    const sensitive = [
      'order_failed',
      'order_canceled',
      'order_refunded',
      'package_shipped',
    ];

    let verifiedOrder = null;
    if (orderId && sensitive.includes(payload.type)) {
      verifiedOrder = await getOrder(orderId);
      logger.info({
        event_type: payload.type,
        printful_order_id: orderId,
        status: 'verified_via_refetch',
      });
    }

    if (orderId) {
      const shipment = extractShipment(payload.data);
      const order = verifiedOrder ?? (await getOrder(orderId));

      await syncLocalOrderFromPrintful(orderId, order, {
        tracking_number: shipment.tracking_number,
        tracking_url: shipment.tracking_url,
        carrier: shipment.carrier,
        shipped_at: payload.type === 'package_shipped' ? new Date().toISOString() : null,
      });
    } else if (payload.type === 'stock_updated') {
      logger.info({ event_type: payload.type }, 'stock_updated registrado; sync catalog vía job');
    }

    await webhookEventsRepo.markWebhookProcessed(eventRecord.id);
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await webhookEventsRepo.markWebhookError(eventRecord.id, message);
    throw err;
  }
}

function extractOrderId(data: Record<string, unknown>): number | undefined {
  const order = data.order as { id?: number } | undefined;
  if (order?.id) return order.id;
  if (typeof data.order_id === 'number') return data.order_id;
  return undefined;
}

function extractShipment(data: Record<string, unknown>): {
  tracking_number: string | null;
  tracking_url: string | null;
  carrier: string | null;
} {
  const shipment = data.shipment as {
    tracking_number?: string;
    tracking_url?: string;
    carrier?: string;
  } | undefined;

  return {
    tracking_number: shipment?.tracking_number ?? null,
    tracking_url: shipment?.tracking_url ?? null,
    carrier: shipment?.carrier ?? null,
  };
}

export async function getUnprocessedWebhookEvents(limit?: number) {
  return webhookEventsRepo.listUnprocessedWebhookEvents(limit);
}

export async function getLocalOrderByPrintfulId(printfulOrderId: number) {
  return ordersRepo.getOrderByPrintfulId(printfulOrderId);
}
