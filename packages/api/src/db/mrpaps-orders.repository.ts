import { supabase } from '../lib/supabase.js';
import type {
  MrpapsOrderItemRow,
  MrpapsOrderRow,
  MrpapsOrderStatus,
  MrpapsOrderWithItems,
} from './mrpaps.types.js';

export type CreateOrderInput = {
  public_id: string;
  order_number: string;
  user_id?: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  customer_tax_number?: string | null;
  ship_address1: string;
  ship_address2?: string | null;
  ship_city: string;
  ship_state_code: string;
  ship_country_code: string;
  ship_zip: string;
  shipping_method: string;
  shipping_label?: string | null;
  subtotal_mxn: number;
  shipping_mxn: number;
  tax_mxn: number;
  total_mxn: number;
  items: Array<{
    variant_id: string;
    design_id?: string | null;
    quantity: number;
    unit_price_mxn: number;
    product_name: string;
    variant_label: string;
    sku: string;
    thumbnail_url?: string | null;
    print_file_url?: string | null;
  }>;
};

export async function generateOrderNumber(): Promise<string> {
  const { data, error } = await supabase.rpc('mrpaps_next_order_number');
  if (error) throw error;
  return String(data);
}

export async function createOrder(input: CreateOrderInput): Promise<MrpapsOrderWithItems> {
  const { items, ...order } = input;

  const { data: orderRow, error: orderError } = await supabase
    .from('mrpaps_orders')
    .insert({
      ...order,
      status: 'pedido',
    })
    .select('*')
    .single();

  if (orderError) throw orderError;

  const orderId = (orderRow as MrpapsOrderRow).id;

  const { data: itemRows, error: itemsError } = await supabase
    .from('mrpaps_order_items')
    .insert(
      items.map((item) => ({
        order_id: orderId,
        ...item,
      })),
    )
    .select('*');

  if (itemsError) throw itemsError;

  await supabase.from('mrpaps_order_status_events').insert({
    order_id: orderId,
    from_status: null,
    to_status: 'pedido',
    note: 'Pedido creado',
    created_by: 'system',
  });

  return {
    ...(orderRow as MrpapsOrderRow),
    items: (itemRows ?? []) as MrpapsOrderItemRow[],
  };
}

export async function listOrderStatusEvents(orderId: string): Promise<
  Array<{
    from_status: MrpapsOrderStatus | null;
    to_status: MrpapsOrderStatus;
    note: string | null;
    created_by: string | null;
    created_at: string;
  }>
> {
  const { data, error } = await supabase
    .from('mrpaps_order_status_events')
    .select('from_status, to_status, note, created_by, created_at')
    .eq('order_id', orderId)
    .order('created_at', { ascending: true });

  if (error) throw error;
  return (data ?? []) as Array<{
    from_status: MrpapsOrderStatus | null;
    to_status: MrpapsOrderStatus;
    note: string | null;
    created_by: string | null;
    created_at: string;
  }>;
}

export async function getOrderByPublicId(publicId: string): Promise<MrpapsOrderWithItems | null> {
  const { data: order, error } = await supabase
    .from('mrpaps_orders')
    .select('*')
    .eq('public_id', publicId)
    .maybeSingle();

  if (error) throw error;
  if (!order) return null;

  const { data: items, error: itemsError } = await supabase
    .from('mrpaps_order_items')
    .select('*')
    .eq('order_id', (order as MrpapsOrderRow).id);

  if (itemsError) throw itemsError;

  return {
    ...(order as MrpapsOrderRow),
    items: (items ?? []) as MrpapsOrderItemRow[],
  };
}

export async function listOrdersAdmin(filters?: {
  status?: MrpapsOrderStatus;
  limit?: number;
}): Promise<MrpapsOrderWithItems[]> {
  let query = supabase
    .from('mrpaps_orders')
    .select('*')
    .order('ordered_at', { ascending: false })
    .limit(filters?.limit ?? 100);

  if (filters?.status) {
    query = query.eq('status', filters.status);
  }

  const { data: orders, error } = await query;
  if (error) throw error;
  if (!orders?.length) return [];

  const orderIds = (orders as MrpapsOrderRow[]).map((o) => o.id);
  const { data: items, error: itemsError } = await supabase
    .from('mrpaps_order_items')
    .select('*')
    .in('order_id', orderIds);

  if (itemsError) throw itemsError;

  const itemsByOrder = new Map<string, MrpapsOrderItemRow[]>();
  for (const item of (items ?? []) as MrpapsOrderItemRow[]) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return (orders as MrpapsOrderRow[]).map((order) => ({
    ...order,
    items: itemsByOrder.get(order.id) ?? [],
  }));
}

export async function updateOrderStatus(
  publicId: string,
  toStatus: MrpapsOrderStatus,
  patch: Partial<{
    tracking_number: string | null;
    tracking_url: string | null;
    carrier: string | null;
    internal_notes: string | null;
    requested_at: string | null;
    received_at: string | null;
    shipped_at: string | null;
  }>,
  meta: { note?: string; createdBy?: string },
): Promise<MrpapsOrderRow> {
  const existing = await getOrderByPublicId(publicId);
  if (!existing) {
    throw new Error('Pedido no encontrado');
  }

  const now = new Date().toISOString();
  const timestamps: Record<string, string> = {};
  const row = existing as MrpapsOrderRow & {
    requested_at?: string | null;
    received_at?: string | null;
  };

  if (toStatus === 'solicitado_imprenta' && !row.requested_at) {
    timestamps.requested_at = now;
  }
  if (toStatus === 'recibido_imprenta' && !row.received_at) {
    timestamps.received_at = now;
  }
  if (toStatus === 'enviado' && !existing.shipped_at) {
    timestamps.shipped_at = now;
  }

  const { data, error } = await supabase
    .from('mrpaps_orders')
    .update({
      status: toStatus,
      ...patch,
      ...timestamps,
    })
    .eq('public_id', publicId)
    .select('*')
    .single();

  if (error) throw error;

  await supabase.from('mrpaps_order_status_events').insert({
    order_id: existing.id,
    from_status: existing.status,
    to_status: toStatus,
    note: meta.note ?? null,
    created_by: meta.createdBy ?? 'admin',
  });

  return data as MrpapsOrderRow;
}

/** Cuántos ítems de pedido referencian cada variante (histórico; no se borran variantes con pedidos). */
export async function countOrderItemsByVariantIds(
  variantIds: string[],
): Promise<Record<string, number>> {
  if (variantIds.length === 0) return {};

  const { data, error } = await supabase
    .from('mrpaps_order_items')
    .select('variant_id')
    .in('variant_id', variantIds);

  if (error) throw error;

  const counts: Record<string, number> = {};
  for (const id of variantIds) counts[id] = 0;
  for (const row of data ?? []) {
    const vid = row.variant_id as string;
    counts[vid] = (counts[vid] ?? 0) + 1;
  }
  return counts;
}
