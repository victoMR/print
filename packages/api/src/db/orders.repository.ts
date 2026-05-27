import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import type { PrintfulOrderInsert, PrintfulOrderRow, PrintfulOrderUpdate } from './types.js';

function mapDbError(operation: string, error: { message: string; code?: string }): never {
  logger.error({ operation, code: error.code, message: error.message }, 'Supabase orders error');
  throw new Error(`orders.${operation}: ${error.message}`);
}

export async function insertOrder(input: PrintfulOrderInsert): Promise<PrintfulOrderRow> {
  const { data, error } = await supabase
    .from('printful_orders')
    .insert(input)
    .select()
    .single();

  if (error || !data) {
    mapDbError('insert', error ?? { message: 'No row returned' });
  }

  return data;
}

export async function getOrderByInternalId(internalOrderId: string): Promise<PrintfulOrderRow | null> {
  const { data, error } = await supabase
    .from('printful_orders')
    .select()
    .eq('internal_order_id', internalOrderId)
    .maybeSingle();

  if (error) {
    mapDbError('getByInternalId', error);
  }

  return data;
}

export async function getOrderByPrintfulId(printfulOrderId: number): Promise<PrintfulOrderRow | null> {
  const { data, error } = await supabase
    .from('printful_orders')
    .select()
    .eq('printful_order_id', printfulOrderId)
    .maybeSingle();

  if (error) {
    mapDbError('getByPrintfulId', error);
  }

  return data;
}

export async function updateOrderByInternalId(
  internalOrderId: string,
  patch: PrintfulOrderUpdate,
): Promise<PrintfulOrderRow> {
  const { data, error } = await supabase
    .from('printful_orders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('internal_order_id', internalOrderId)
    .select()
    .single();

  if (error || !data) {
    mapDbError('updateByInternalId', error ?? { message: 'No row returned' });
  }

  return data;
}

export async function updateOrderByPrintfulId(
  printfulOrderId: number,
  patch: PrintfulOrderUpdate,
): Promise<PrintfulOrderRow | null> {
  const { data, error } = await supabase
    .from('printful_orders')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('printful_order_id', printfulOrderId)
    .select()
    .maybeSingle();

  if (error) {
    mapDbError('updateByPrintfulId', error);
  }

  return data;
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
