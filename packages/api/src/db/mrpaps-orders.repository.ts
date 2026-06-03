import { query, queryOne, queryRequired, buildUpdateSet } from '../lib/db-helper.js';
import { generateTrackingCode, normalizeTrackingCode } from '../lib/order-tracking-code.js';
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
  const row = await queryRequired<{ mrpaps_next_order_number: string }>(
    `SELECT mrpaps_next_order_number() AS mrpaps_next_order_number`,
  );
  return row.mrpaps_next_order_number;
}

export async function reserveUniquePublicId(maxAttempts = 10): Promise<string> {
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    const publicId = generateTrackingCode();
    const existing = await queryOne<{ exists: boolean }>(
      `SELECT EXISTS(SELECT 1 FROM mrpaps_orders WHERE public_id = $1) AS exists`,
      [publicId],
    );
    if (!existing?.exists) return publicId;
  }
  throw new Error('No se pudo generar un código de seguimiento único');
}

export async function createOrder(input: CreateOrderInput): Promise<MrpapsOrderWithItems> {
  const { items, ...order } = input;

  const orderRow = await queryRequired<MrpapsOrderRow>(
    `INSERT INTO mrpaps_orders (
       public_id, order_number, user_id, customer_name, customer_email, customer_phone,
       customer_tax_number, ship_address1, ship_address2, ship_city, ship_state_code,
       ship_country_code, ship_zip, shipping_method, shipping_label,
       subtotal_mxn, shipping_mxn, tax_mxn, total_mxn, status
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, 'pedido'
     ) RETURNING *`,
    [
      order.public_id,
      order.order_number,
      order.user_id ?? null,
      order.customer_name,
      order.customer_email,
      order.customer_phone,
      order.customer_tax_number ?? null,
      order.ship_address1,
      order.ship_address2 ?? null,
      order.ship_city,
      order.ship_state_code,
      order.ship_country_code,
      order.ship_zip,
      order.shipping_method,
      order.shipping_label ?? null,
      order.subtotal_mxn,
      order.shipping_mxn,
      order.tax_mxn,
      order.total_mxn,
    ],
  );

  const itemRows: MrpapsOrderItemRow[] = [];
  for (const item of items) {
    const row = await queryRequired<MrpapsOrderItemRow>(
      `INSERT INTO mrpaps_order_items (
         order_id, variant_id, design_id, quantity, unit_price_mxn,
         product_name, variant_label, sku, thumbnail_url, print_file_url
       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [
        orderRow.id,
        item.variant_id,
        item.design_id ?? null,
        item.quantity,
        item.unit_price_mxn,
        item.product_name,
        item.variant_label,
        item.sku,
        item.thumbnail_url ?? null,
        item.print_file_url ?? null,
      ],
    );
    itemRows.push(row);
  }

  await query(
    `INSERT INTO mrpaps_order_status_events (order_id, from_status, to_status, note, created_by)
     VALUES ($1, NULL, 'pedido', 'Pedido creado', 'system')`,
    [orderRow.id],
  );

  return { ...orderRow, items: itemRows };
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
  return query(
    `SELECT from_status, to_status, note, created_by, created_at
     FROM mrpaps_order_status_events
     WHERE order_id = $1
     ORDER BY created_at ASC`,
    [orderId],
  );
}

async function loadOrderWithItems(order: MrpapsOrderRow): Promise<MrpapsOrderWithItems> {
  const items = await query<MrpapsOrderItemRow>(
    `SELECT * FROM mrpaps_order_items WHERE order_id = $1`,
    [order.id],
  );
  return { ...order, items };
}

export async function getOrderByPublicId(rawPublicId: string): Promise<MrpapsOrderWithItems | null> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return null;

  const order = await queryOne<MrpapsOrderRow>(
    `SELECT * FROM mrpaps_orders WHERE public_id = $1`,
    [publicId],
  );
  if (!order) return null;
  return loadOrderWithItems(order);
}

export async function getOrderByPublicIdAndEmail(
  rawPublicId: string,
  email: string,
): Promise<MrpapsOrderWithItems | null> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return null;

  const order = await queryOne<MrpapsOrderRow>(
    `SELECT * FROM mrpaps_orders
     WHERE public_id = $1 AND lower(customer_email) = lower($2)`,
    [publicId, email.trim()],
  );
  if (!order) return null;
  return loadOrderWithItems(order);
}

export async function getOrderForCustomer(
  rawPublicId: string,
  userId: string,
  email: string,
): Promise<MrpapsOrderWithItems | null> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return null;

  const order = await queryOne<MrpapsOrderRow>(
    `SELECT * FROM mrpaps_orders
     WHERE public_id = $1
       AND (user_id = $2::uuid OR lower(customer_email) = lower($3))`,
    [publicId, userId, email.trim()],
  );
  if (!order) return null;
  return loadOrderWithItems(order);
}

export async function getOrderForPayment(rawPublicId: string): Promise<{
  id: string;
  public_id: string;
  total_mxn: string;
  customer_email: string;
  user_id: string | null;
  payment_status: string | null;
} | null> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return null;

  return queryOne(
    `SELECT id, public_id, total_mxn::text, customer_email, user_id, payment_status
     FROM mrpaps_orders WHERE public_id = $1`,
    [publicId],
  );
}

export async function getOrderPaymentSnapshot(rawPublicId: string): Promise<{
  id: string;
  total_mxn: string;
  payment_status: string | null;
} | null> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return null;

  return queryOne(
    `SELECT id, total_mxn::text, payment_status FROM mrpaps_orders WHERE public_id = $1`,
    [publicId],
  );
}

export async function updateOrderPaymentByPublicId(
  publicId: string,
  patch: {
    stripe_payment_intent_id?: string;
    payment_status: string;
  },
): Promise<void> {
  const { clause, values } = buildUpdateSet({
    stripe_payment_intent_id: patch.stripe_payment_intent_id,
    payment_status: patch.payment_status,
    updated_at: new Date().toISOString(),
  });
  await query(`UPDATE mrpaps_orders SET ${clause} WHERE public_id = $1`, [publicId, ...values]);
}

export async function listOrdersAdmin(filters?: {
  status?: MrpapsOrderStatus;
  limit?: number;
}): Promise<MrpapsOrderWithItems[]> {
  const params: unknown[] = [];
  let sql = `SELECT * FROM mrpaps_orders`;
  if (filters?.status) {
    params.push(filters.status);
    sql += ` WHERE status = $${params.length}`;
  }
  params.push(filters?.limit ?? 100);
  sql += ` ORDER BY ordered_at DESC LIMIT $${params.length}`;

  const orders = await query<MrpapsOrderRow>(sql, params);
  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const items = await query<MrpapsOrderItemRow>(
    `SELECT * FROM mrpaps_order_items WHERE order_id = ANY($1::uuid[])`,
    [orderIds],
  );

  const itemsByOrder = new Map<string, MrpapsOrderItemRow[]>();
  for (const item of items) {
    const list = itemsByOrder.get(item.order_id) ?? [];
    list.push(item);
    itemsByOrder.set(item.order_id, list);
  }

  return orders.map((order) => ({
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
  if (!existing) throw new Error('Pedido no encontrado');

  const now = new Date().toISOString();
  const timestamps: Record<string, string> = {};
  const row = existing as MrpapsOrderRow & {
    requested_at?: string | null;
    received_at?: string | null;
  };

  if (toStatus === 'solicitado_imprenta' && !row.requested_at) timestamps.requested_at = now;
  if (toStatus === 'recibido_imprenta' && !row.received_at) timestamps.received_at = now;
  if (toStatus === 'enviado' && !existing.shipped_at) timestamps.shipped_at = now;

  const { clause, values } = buildUpdateSet({
    status: toStatus,
    ...patch,
    ...timestamps,
    updated_at: now,
  });

  const updated = await queryRequired<MrpapsOrderRow>(
    `UPDATE mrpaps_orders SET ${clause} WHERE public_id = $1 RETURNING *`,
    [publicId, ...values],
  );

  await query(
    `INSERT INTO mrpaps_order_status_events (order_id, from_status, to_status, note, created_by)
     VALUES ($1, $2, $3, $4, $5)`,
    [existing.id, existing.status, toStatus, meta.note ?? null, meta.createdBy ?? 'admin'],
  );

  return updated;
}

export async function countOrderItemsByVariantIds(
  variantIds: string[],
): Promise<Record<string, number>> {
  if (variantIds.length === 0) return {};

  const rows = await query<{ variant_id: string }>(
    `SELECT variant_id FROM mrpaps_order_items WHERE variant_id = ANY($1::uuid[])`,
    [variantIds],
  );

  const counts: Record<string, number> = {};
  for (const id of variantIds) counts[id] = 0;
  for (const row of rows) {
    counts[row.variant_id] = (counts[row.variant_id] ?? 0) + 1;
  }
  return counts;
}
