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
    printed_at: string | null;
    shipped_at: string | null;
  }>,
  meta: { note?: string; createdBy?: string },
): Promise<MrpapsOrderRow> {
  const existing = await getOrderByPublicId(publicId);
  if (!existing) {
    throw new Error('Pedido no encontrado');
  }

  const timestamps: Record<string, string | null> = {};
  if (toStatus === 'impreso' && !existing.printed_at) {
    timestamps.printed_at = new Date().toISOString();
  }
  if (toStatus === 'enviado' && !existing.shipped_at) {
    timestamps.shipped_at = new Date().toISOString();
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

export async function decrementStockForOrder(items: CreateOrderInput['items']): Promise<void> {
  for (const item of items) {
    const { data: variant, error: fetchError } = await supabase
      .from('mrpaps_product_variants')
      .select('stock_quantity')
      .eq('id', item.variant_id)
      .single();

    if (fetchError) throw fetchError;

    const nextStock = Math.max(0, Number(variant.stock_quantity) - item.quantity);
    const { error: updateError } = await supabase
      .from('mrpaps_product_variants')
      .update({ stock_quantity: nextStock })
      .eq('id', item.variant_id);

    if (updateError) throw updateError;
  }
}
