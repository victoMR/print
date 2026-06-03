import { queryOne, queryRequired } from '../lib/db-helper.js';
import { logger } from '../lib/logger.js';
import type { PrintfulOrderInsert, PrintfulOrderRow, PrintfulOrderUpdate } from './types.js';

function mapDbError(operation: string, error: Error): never {
  logger.error({ operation, message: error.message }, 'PostgreSQL orders error');
  throw new Error(`orders.${operation}: ${error.message}`);
}

export async function insertOrder(input: PrintfulOrderInsert): Promise<PrintfulOrderRow> {
  try {
    return await queryRequired<PrintfulOrderRow>(
      `INSERT INTO printful_orders (
         internal_order_id, printful_order_id, customer_rfc, status, total_mxn,
         shipping_method, tracking_number, tracking_url, carrier, shipped_at, raw_payload
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
       RETURNING *`,
      [
        input.internal_order_id,
        input.printful_order_id ?? null,
        input.customer_rfc ?? null,
        input.status,
        input.total_mxn,
        input.shipping_method ?? null,
        input.tracking_number ?? null,
        input.tracking_url ?? null,
        input.carrier ?? null,
        input.shipped_at ?? null,
        JSON.stringify(input.raw_payload ?? {}),
      ],
    );
  } catch (err) {
    mapDbError('insert', err instanceof Error ? err : new Error(String(err)));
  }
}

export async function getOrderByInternalId(
  internalOrderId: string,
): Promise<PrintfulOrderRow | null> {
  return queryOne<PrintfulOrderRow>(
    `SELECT * FROM printful_orders WHERE internal_order_id = $1`,
    [internalOrderId],
  );
}

export async function getOrderByPrintfulId(
  printfulOrderId: number,
): Promise<PrintfulOrderRow | null> {
  return queryOne<PrintfulOrderRow>(
    `SELECT * FROM printful_orders WHERE printful_order_id = $1`,
    [printfulOrderId],
  );
}

export async function updateOrderByInternalId(
  internalOrderId: string,
  patch: PrintfulOrderUpdate,
): Promise<PrintfulOrderRow> {
  try {
    return await queryRequired<PrintfulOrderRow>(
      `UPDATE printful_orders SET
         customer_rfc = COALESCE($2, customer_rfc),
         status = COALESCE($3, status),
         total_mxn = COALESCE($4, total_mxn),
         shipping_method = COALESCE($5, shipping_method),
         tracking_number = COALESCE($6, tracking_number),
         tracking_url = COALESCE($7, tracking_url),
         carrier = COALESCE($8, carrier),
         shipped_at = COALESCE($9, shipped_at),
         cfdi_uuid = COALESCE($10, cfdi_uuid),
         cfdi_xml_url = COALESCE($11, cfdi_xml_url),
         raw_payload = COALESCE($12, raw_payload),
         updated_at = NOW()
       WHERE internal_order_id = $1
       RETURNING *`,
      [
        internalOrderId,
        patch.customer_rfc ?? null,
        patch.status ?? null,
        patch.total_mxn ?? null,
        patch.shipping_method ?? null,
        patch.tracking_number ?? null,
        patch.tracking_url ?? null,
        patch.carrier ?? null,
        patch.shipped_at ?? null,
        patch.cfdi_uuid ?? null,
        patch.cfdi_xml_url ?? null,
        patch.raw_payload ? JSON.stringify(patch.raw_payload) : null,
      ],
    );
  } catch (err) {
    mapDbError('updateByInternalId', err instanceof Error ? err : new Error(String(err)));
  }
}

export async function updateOrderByPrintfulId(
  printfulOrderId: number,
  patch: PrintfulOrderUpdate,
): Promise<PrintfulOrderRow | null> {
  try {
    return await queryOne<PrintfulOrderRow>(
      `UPDATE printful_orders SET
         customer_rfc = COALESCE($2, customer_rfc),
         status = COALESCE($3, status),
         total_mxn = COALESCE($4, total_mxn),
         shipping_method = COALESCE($5, shipping_method),
         tracking_number = COALESCE($6, tracking_number),
         tracking_url = COALESCE($7, tracking_url),
         carrier = COALESCE($8, carrier),
         shipped_at = COALESCE($9, shipped_at),
         cfdi_uuid = COALESCE($10, cfdi_uuid),
         cfdi_xml_url = COALESCE($11, cfdi_xml_url),
         raw_payload = COALESCE($12, raw_payload),
         updated_at = NOW()
       WHERE printful_order_id = $1
       RETURNING *`,
      [
        printfulOrderId,
        patch.customer_rfc ?? null,
        patch.status ?? null,
        patch.total_mxn ?? null,
        patch.shipping_method ?? null,
        patch.tracking_number ?? null,
        patch.tracking_url ?? null,
        patch.carrier ?? null,
        patch.shipped_at ?? null,
        patch.cfdi_uuid ?? null,
        patch.cfdi_xml_url ?? null,
        patch.raw_payload ? JSON.stringify(patch.raw_payload) : null,
      ],
    );
  } catch (err) {
    mapDbError('updateByPrintfulId', err instanceof Error ? err : new Error(String(err)));
  }
}

export async function upsertOrderFromPrintful(
  printfulOrderId: number,
  patch: PrintfulOrderUpdate & { internal_order_id?: string; total_mxn?: number | string },
): Promise<PrintfulOrderRow> {
  const existing = await getOrderByPrintfulId(printfulOrderId);

  if (existing) {
    const { internal_order_id: _ignored, ...updatePatch } = patch;
    const updated = await updateOrderByPrintfulId(printfulOrderId, updatePatch);
    if (updated) return updated;
  }

  if (!patch.internal_order_id || patch.total_mxn === undefined) {
    throw new Error('upsertOrderFromPrintful requires internal_order_id and total_mxn for new rows');
  }

  return insertOrder({
    internal_order_id: patch.internal_order_id,
    printful_order_id: printfulOrderId,
    customer_rfc: patch.customer_rfc ?? null,
    status: patch.status ?? 'draft',
    total_mxn: patch.total_mxn,
    shipping_method: patch.shipping_method ?? null,
    tracking_number: patch.tracking_number ?? null,
    tracking_url: patch.tracking_url ?? null,
    carrier: patch.carrier ?? null,
    shipped_at: patch.shipped_at ?? null,
    raw_payload: patch.raw_payload ?? {},
  });
}
