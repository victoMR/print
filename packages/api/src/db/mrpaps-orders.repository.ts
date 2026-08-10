import { query, queryOne, queryRequired, buildUpdateSet, withTransaction } from '../lib/db-helper.js';
import { pool } from '../lib/db.js';
import * as productsRepo from './mrpaps-products.repository.js';
import { BadRequestError } from '../types/errors.js';
import { generateTrackingCode, normalizeTrackingCode } from '../lib/order-tracking-code.js';
import { marketForCurrency } from '../lib/market.js';
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
  currency: 'MXN' | 'USD';
  subtotal_mxn?: number | null;
  shipping_mxn?: number | null;
  tax_mxn?: number | null;
  total_mxn?: number | null;
  subtotal_usd?: number | null;
  shipping_usd?: number | null;
  tax_usd?: number | null;
  total_usd?: number | null;
  terms_accepted_at?: string | null;
  legal_accepted_version?: string | null;
  items: Array<{
    variant_id: string;
    design_id?: string | null;
    quantity: number;
    inventory_reserved_qty?: number;
    unit_price_mxn: number;
    unit_price_usd?: number | null;
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

  return withTransaction(async (client) => {
    const orderResult = await client.query<MrpapsOrderRow>(
      `INSERT INTO mrpaps_orders (
         public_id, order_number, user_id, customer_name, customer_email, customer_phone,
         customer_tax_number, ship_address1, ship_address2, ship_city, ship_state_code,
         ship_country_code, ship_zip, shipping_method, shipping_label,
         currency, subtotal_mxn, shipping_mxn, tax_mxn, total_mxn,
         subtotal_usd, shipping_usd, tax_usd, total_usd, status,
         terms_accepted_at, legal_accepted_version
       ) VALUES (
         $1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19,
         $20, $21, $22, $23, $24, 'pendiente_pago', $25, $26
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
        order.currency,
        order.subtotal_mxn ?? null,
        order.shipping_mxn ?? null,
        order.tax_mxn ?? null,
        order.total_mxn ?? null,
        order.subtotal_usd ?? null,
        order.shipping_usd ?? null,
        order.tax_usd ?? null,
        order.total_usd ?? null,
        order.terms_accepted_at ?? null,
        order.legal_accepted_version ?? null,
      ],
    );

    const orderRow = orderResult.rows[0];
    if (!orderRow) throw new Error('Failed to insert order');

    const market = marketForCurrency(order.currency);
    const itemRows: MrpapsOrderItemRow[] = [];
    for (const item of items) {
      // Reserve stock at order creation (standard soft-reservation model).
      // POD variants (is_pod = true) return 0 — no deduction needed.
      const deducted =
        item.inventory_reserved_qty != null
          ? item.inventory_reserved_qty
          : await productsRepo.reserveVariantStockTx(client, item.variant_id, item.quantity, market);

      if (deducted === false) {
        throw new BadRequestError(
          'No hay suficiente stock para completar el pedido. Actualiza tu carrito e intenta de nuevo.',
        );
      }

      const itemResult = await client.query<MrpapsOrderItemRow>(
        `INSERT INTO mrpaps_order_items (
           order_id, variant_id, design_id, quantity, inventory_reserved_qty, unit_price_mxn,
           unit_price_usd, product_name, variant_label, sku, thumbnail_url, print_file_url
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)
         RETURNING *`,
        [
          orderRow.id,
          item.variant_id,
          item.design_id ?? null,
          item.quantity,
          deducted,
          item.unit_price_mxn,
          item.unit_price_usd ?? null,
          item.product_name,
          item.variant_label,
          item.sku,
          item.thumbnail_url ?? null,
          item.print_file_url ?? null,
        ],
      );
      const row = itemResult.rows[0];
      if (!row) throw new Error('Failed to insert order item');
      itemRows.push(row);
    }

    await client.query(
      `INSERT INTO mrpaps_order_status_events (order_id, from_status, to_status, note, created_by)
       VALUES ($1, NULL, 'pendiente_pago', 'Pedido creado, pendiente de pago', 'system')`,
      [orderRow.id],
    );

    return { ...orderRow, items: itemRows };
  });
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

export async function getOrderByOrderNumberAndEmail(
  orderNumber: string,
  email: string,
): Promise<MrpapsOrderWithItems | null> {
  const order = await queryOne<MrpapsOrderRow>(
    `SELECT * FROM mrpaps_orders
     WHERE order_number = $1 AND lower(customer_email) = lower($2)`,
    [orderNumber.trim().toUpperCase(), email.trim()],
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
  rawCode: string,
  userId: string,
  email: string,
): Promise<MrpapsOrderWithItems | null> {
  const publicId = normalizeTrackingCode(rawCode);
  if (publicId) {
    const order = await queryOne<MrpapsOrderRow>(
      `SELECT * FROM mrpaps_orders
       WHERE public_id = $1
         AND (user_id = $2::uuid OR lower(customer_email) = lower($3))`,
      [publicId, userId, email.trim()],
    );
    if (order) return loadOrderWithItems(order);
  }

  const orderNumber = rawCode.trim().toUpperCase();
  if (!/^MRP-\d{4}-\d{5}$/.test(orderNumber)) return null;

  const byNumber = await queryOne<MrpapsOrderRow>(
    `SELECT * FROM mrpaps_orders
     WHERE order_number = $1
       AND (user_id = $2::uuid OR lower(customer_email) = lower($3))`,
    [orderNumber, userId, email.trim()],
  );
  if (!byNumber) return null;
  return loadOrderWithItems(byNumber);
}

export async function getOrderForPayment(rawPublicId: string): Promise<{
  id: string;
  public_id: string;
  currency: 'MXN' | 'USD';
  total_mxn: string | null;
  total_usd: string | null;
  customer_email: string;
  user_id: string | null;
  payment_status: string | null;
} | null> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return null;

  return queryOne(
    `SELECT id, public_id, currency, total_mxn::text, total_usd::text, customer_email, user_id, payment_status
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
  rawPublicId: string,
  patch: {
    stripe_payment_intent_id?: string;
    payment_status: string;
    // Monto real liquidado en MXN y tipo de cambio de Stripe (balance transaction),
    // no una estimación propia — ver mrpaps-payment.service.ts.
    stripe_settlement_amount_mxn?: number;
    stripe_fx_rate?: number;
  },
): Promise<void> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return;

  const { clause, values } = buildUpdateSet({
    stripe_payment_intent_id: patch.stripe_payment_intent_id,
    payment_status: patch.payment_status,
    stripe_settlement_amount_mxn: patch.stripe_settlement_amount_mxn,
    stripe_fx_rate: patch.stripe_fx_rate,
    updated_at: new Date().toISOString(),
  });
  await query(`UPDATE mrpaps_orders SET ${clause} WHERE public_id = $1`, [publicId, ...values]);
}

export async function getOrderForPaymentFinalize(rawPublicId: string): Promise<{
  id: string;
  public_id: string;
  status: MrpapsOrderStatus;
  currency: 'MXN' | 'USD';
  total_mxn: string | null;
  total_usd: string | null;
  customer_email: string;
  payment_status: string | null;
  stripe_payment_intent_id: string | null;
  confirmation_email_sent_at: string | null;
} | null> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return null;

  return queryOne(
    `SELECT id, public_id, status, currency, total_mxn::text, total_usd::text, customer_email, payment_status,
            stripe_payment_intent_id, confirmation_email_sent_at
     FROM mrpaps_orders WHERE public_id = $1`,
    [publicId],
  );
}

/**
 * Atomically marks an order as paid only if it isn't paid yet.
 * Returns true if this call won the race (rowCount === 1), false if already paid.
 */
export async function tryMarkOrderAsPaid(rawPublicId: string): Promise<boolean> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return false;

  // Solo permite la transición desde un estado genuinamente pendiente: un pedido
  // 'refunded' (o 'failed') nunca debe poder regresar a 'paid' por esta vía.
  const result = await pool.query(
    `UPDATE mrpaps_orders
     SET payment_status = 'paid', updated_at = NOW()
     WHERE public_id = $1 AND (payment_status IS NULL OR payment_status = 'pending')`,
    [publicId],
  );
  return (result.rowCount ?? 0) > 0;
}

/**
 * Descuenta inventario al confirmar pago. Idempotente si ya se descontó (inventory_reserved_qty > 0).
 */
export async function commitOrderInventoryOnPaid(rawPublicId: string): Promise<{ ok: true } | { ok: false; reason: string }> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return { ok: false, reason: 'invalid_id' };

  return withTransaction(async (client) => {
    const orderResult = await client.query<MrpapsOrderRow>(
      `SELECT * FROM mrpaps_orders WHERE public_id = $1 FOR UPDATE`,
      [publicId],
    );
    const orderRow = orderResult.rows[0];
    if (!orderRow) return { ok: false, reason: 'not_found' };

    const itemsResult = await client.query<MrpapsOrderItemRow>(
      `SELECT * FROM mrpaps_order_items WHERE order_id = $1 FOR UPDATE`,
      [orderRow.id],
    );

    const market = marketForCurrency(orderRow.currency);
    for (const item of itemsResult.rows) {
      if ((item.inventory_reserved_qty ?? 0) > 0) continue;

      const deducted = await productsRepo.reserveVariantStockTx(client, item.variant_id, item.quantity, market);
      if (deducted === false) {
        return {
          ok: false,
          reason: `stock_insufficient:${item.variant_id}`,
        };
      }

      await client.query(
        `UPDATE mrpaps_order_items SET inventory_reserved_qty = $2 WHERE id = $1`,
        [item.id, deducted],
      );
    }

    return { ok: true };
  });
}

export async function markConfirmationEmailSent(rawPublicId: string): Promise<void> {
  const publicId = normalizeTrackingCode(rawPublicId);
  if (!publicId) return;

  await query(
    `UPDATE mrpaps_orders
     SET confirmation_email_sent_at = NOW(), updated_at = NOW()
     WHERE public_id = $1 AND confirmation_email_sent_at IS NULL`,
    [publicId],
  );
}

export async function listOrdersAdmin(filters?: {
  status?: MrpapsOrderStatus;
  excludeStatuses?: MrpapsOrderStatus[];
  /** Solo pedidos con pago confirmado (panel admin — oculta pendiente de pago). */
  paidOnly?: boolean;
  search?: string;
  currency?: 'MXN' | 'USD';
  limit?: number;
}): Promise<MrpapsOrderWithItems[]> {
  const params: unknown[] = [];
  const conditions: string[] = [];
  let sql = `SELECT * FROM mrpaps_orders`;

  if (filters?.paidOnly) {
    conditions.push(`payment_status = 'paid'`);
    conditions.push(`status <> 'pendiente_pago'`);
  }

  if (filters?.status) {
    if (filters.status === 'pendiente_pago') {
      return [];
    }
    params.push(filters.status);
    conditions.push(`status = $${params.length}`);
  } else if (filters?.excludeStatuses?.length) {
    params.push(filters.excludeStatuses);
    conditions.push(`status <> ALL($${params.length}::mrpaps_order_status[])`);
  }

  if (filters?.currency) {
    params.push(filters.currency);
    conditions.push(`currency = $${params.length}`);
  }

  if (filters?.search?.trim()) {
    const term = `%${filters.search.trim()}%`;
    params.push(term);
    const n = params.length;
    conditions.push(
      `(customer_name ILIKE $${n} OR customer_email ILIKE $${n} OR order_number ILIKE $${n} OR public_id ILIKE $${n})`,
    );
  }

  if (conditions.length > 0) {
    sql += ` WHERE ${conditions.join(' AND ')}`;
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

/** Legal status transitions — prevents moving orders into invalid states. */
const ALLOWED_STATUS_TRANSITIONS: Record<MrpapsOrderStatus, MrpapsOrderStatus[]> = {
  pendiente_pago:      ['pedido', 'cancelado'],
  pedido:              ['solicitado_imprenta', 'cancelado'],
  solicitado_imprenta: ['recibido_imprenta', 'cancelado'],
  recibido_imprenta:   ['enviado', 'cancelado'],
  enviado:             [],   // terminal — no further transitions
  cancelado:           [],   // terminal — no further transitions
};

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

  const payment = existing.payment_status;
  const isAbandonCancel =
    existing.status === 'pendiente_pago' && toStatus === 'cancelado' && payment !== 'paid';
  const isPaidCancel =
    toStatus === 'cancelado' && (payment === 'paid' || payment === 'refunded');
  const isSystemFulfillment =
    existing.status === 'pendiente_pago' && toStatus === 'pedido' && payment === 'paid';

  if (!isAbandonCancel && !isPaidCancel && !isSystemFulfillment && payment !== 'paid') {
    throw new Error('Solo se pueden actualizar pedidos pagados');
  }

  const allowed = ALLOWED_STATUS_TRANSITIONS[existing.status];
  if (!allowed.includes(toStatus)) {
    throw new Error(
      `Transición de estado inválida: ${existing.status} → ${toStatus}. ` +
      `Estados permitidos: ${allowed.length > 0 ? allowed.join(', ') : 'ninguno (estado terminal)'}`,
    );
  }

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

  const updated = await withTransaction(async (client) => {
    const orderResult = await client.query<MrpapsOrderRow>(
      `UPDATE mrpaps_orders SET ${clause} WHERE public_id = $1 RETURNING *`,
      [publicId, ...values],
    );
    const orderRow = orderResult.rows[0];
    if (!orderRow) throw new Error('Pedido no encontrado');

    // Al cancelar, devolver al inventario cualquier unidad descontada.
    // Leemos los items DENTRO de la transacción con FOR UPDATE para evitar
    // doble liberación si el cron de expiración corrió entre getOrderByPublicId
    // y esta transacción (TOCTOU race con releaseExpiredOrderReservations).
    if (toStatus === 'cancelado') {
      const freshItems = await client.query<MrpapsOrderItemRow>(
        `SELECT * FROM mrpaps_order_items WHERE order_id = $1 FOR UPDATE`,
        [existing.id],
      );
      const market = marketForCurrency(existing.currency);
      let releasedAny = false;
      for (const item of freshItems.rows) {
        const reserved = item.inventory_reserved_qty ?? 0;
        if (reserved > 0) {
          await productsRepo.releaseVariantStockTx(client, item.variant_id, reserved, market);
          releasedAny = true;
        }
      }
      if (releasedAny) {
        await client.query(
          `UPDATE mrpaps_order_items SET inventory_reserved_qty = 0 WHERE order_id = $1`,
          [existing.id],
        );
      }
    }

    await client.query(
      `INSERT INTO mrpaps_order_status_events (order_id, from_status, to_status, note, created_by)
       VALUES ($1, $2, $3, $4, $5)`,
      [existing.id, existing.status, toStatus, meta.note ?? null, meta.createdBy ?? 'admin'],
    );

    return orderRow;
  });

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

/**
 * Libera el stock reservado por órdenes en estado pendiente_pago cuyo TTL expiró.
 * Idempotente — SKIP LOCKED evita conflictos con transacciones concurrentes.
 * @returns número de items cuyo stock fue liberado.
 */
export async function releaseExpiredOrderReservations(ttlMinutes = 20): Promise<number> {
  return withTransaction(async (client) => {
    const expiredItems = await client.query<{
      id: string;
      variant_id: string;
      inventory_reserved_qty: number;
      currency: 'MXN' | 'USD';
    }>(
      `SELECT oi.id, oi.variant_id, oi.inventory_reserved_qty, o.currency
       FROM mrpaps_order_items oi
       JOIN mrpaps_orders o ON o.id = oi.order_id
       WHERE o.status = 'pendiente_pago'
         AND (o.payment_status IS NULL OR o.payment_status <> 'paid')
         AND o.ordered_at < NOW() - ($1::int * interval '1 minute')
         AND oi.inventory_reserved_qty > 0
       FOR UPDATE OF oi SKIP LOCKED`,
      [ttlMinutes],
    );

    if (expiredItems.rows.length === 0) return 0;

    for (const item of expiredItems.rows) {
      await productsRepo.releaseVariantStockTx(
        client,
        item.variant_id,
        item.inventory_reserved_qty,
        marketForCurrency(item.currency),
      );
    }

    await client.query(
      `UPDATE mrpaps_order_items SET inventory_reserved_qty = 0
       WHERE id = ANY($1::uuid[])`,
      [expiredItems.rows.map((r) => r.id)],
    );

    return expiredItems.rows.length;
  });
}
