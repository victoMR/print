import { query, queryOne, queryRequired, buildUpdateSet } from '../lib/db-helper.js';
import type { MrpapsAddressRow, MrpapsUserRow } from './mrpaps.types.js';

export async function findUserByEmail(email: string): Promise<MrpapsUserRow | null> {
  return queryOne<MrpapsUserRow>(
    `SELECT * FROM mrpaps_users WHERE lower(email) = lower($1)`,
    [email.trim()],
  );
}

export async function findUserByEmailForAuth(email: string): Promise<MrpapsUserRow | null> {
  return findUserByEmail(email);
}

export async function upsertAdminUser(input: {
  email: string;
  full_name: string;
  password_hash: string;
}): Promise<MrpapsUserRow> {
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);

  if (existing) {
    return queryRequired<MrpapsUserRow>(
      `UPDATE mrpaps_users
       SET full_name = $2, role = 'admin', password_hash = $3, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [existing.id, input.full_name, input.password_hash],
    );
  }

  return queryRequired<MrpapsUserRow>(
    `INSERT INTO mrpaps_users (email, full_name, role, password_hash)
     VALUES ($1, $2, 'admin', $3)
     RETURNING *`,
    [email, input.full_name, input.password_hash],
  );
}

export async function upsertCustomerWithPassword(input: {
  email: string;
  full_name: string;
  phone: string | null;
  password_hash: string;
}): Promise<MrpapsUserRow> {
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);

  if (existing) {
    return queryRequired<MrpapsUserRow>(
      `UPDATE mrpaps_users
       SET full_name = $2, phone = $3, password_hash = $4, updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [existing.id, input.full_name, input.phone, input.password_hash],
    );
  }

  return queryRequired<MrpapsUserRow>(
    `INSERT INTO mrpaps_users (email, full_name, phone, role, password_hash)
     VALUES ($1, $2, $3, 'customer', $4)
     RETURNING *`,
    [email, input.full_name, input.phone, input.password_hash],
  );
}

export async function updateCustomer(
  userId: string,
  patch: { full_name?: string; phone?: string | null },
): Promise<MrpapsUserRow> {
  const { clause, values } = buildUpdateSet({ ...patch, updated_at: new Date().toISOString() });
  return queryRequired<MrpapsUserRow>(
    `UPDATE mrpaps_users SET ${clause} WHERE id = $1 RETURNING *`,
    [userId, ...values],
  );
}

export async function deleteAddress(addressId: string, userId: string): Promise<void> {
  await query(`DELETE FROM mrpaps_addresses WHERE id = $1 AND user_id = $2`, [addressId, userId]);
}

export async function updateAddress(
  addressId: string,
  userId: string,
  patch: Partial<{
    label: string;
    recipient_name: string;
    phone: string;
    address1: string;
    address2: string | null;
    city: string;
    state_code: string;
    zip: string;
    is_default: boolean;
  }>,
): Promise<MrpapsAddressRow> {
  if (patch.is_default) {
    await query(`UPDATE mrpaps_addresses SET is_default = false WHERE user_id = $1`, [userId]);
  }
  const { clause, values } = buildUpdateSet({ ...patch, updated_at: new Date().toISOString() });
  return queryRequired<MrpapsAddressRow>(
    `UPDATE mrpaps_addresses SET ${clause} WHERE id = $1 AND user_id = $2 RETURNING *`,
    [addressId, userId, ...values],
  );
}

export async function linkOrphanOrdersByEmail(userId: string, email: string): Promise<void> {
  await query(
    `UPDATE mrpaps_orders SET user_id = $1
     WHERE user_id IS NULL AND lower(customer_email) = lower($2)`,
    [userId, email.trim()],
  );
}

export async function listOrdersByUser(
  userId: string,
  email?: string,
): Promise<
  {
    id: string;
    public_id: string;
    order_number: string;
    status: string;
    total_mxn: string;
    ordered_at: string;
    item_count: number;
  }[]
> {
  if (email) {
    await linkOrphanOrdersByEmail(userId, email);
  }

  const orders = await query<{
    id: string;
    public_id: string;
    order_number: string;
    status: string;
    total_mxn: string;
    ordered_at: string;
  }>(
    `SELECT id, public_id, order_number, status, total_mxn::text, ordered_at
     FROM mrpaps_orders
     WHERE user_id = $1
     ORDER BY ordered_at DESC`,
    [userId],
  );

  if (orders.length === 0) return [];

  const orderIds = orders.map((o) => o.id);
  const items = await query<{ order_id: string; quantity: number }>(
    `SELECT order_id, quantity FROM mrpaps_order_items WHERE order_id = ANY($1::uuid[])`,
    [orderIds],
  );

  const countByOrder = new Map<string, number>();
  for (const item of items) {
    countByOrder.set(item.order_id, (countByOrder.get(item.order_id) ?? 0) + item.quantity);
  }

  return orders.map((o) => ({
    ...o,
    item_count: countByOrder.get(o.id) ?? 0,
  }));
}

export async function upsertUserByEmail(input: {
  email: string;
  full_name: string;
  phone?: string | null;
  tax_number?: string | null;
  auth_user_id?: string | null;
}): Promise<MrpapsUserRow> {
  const email = input.email.trim().toLowerCase();
  const existing = await findUserByEmail(email);

  if (existing) {
    return queryRequired<MrpapsUserRow>(
      `UPDATE mrpaps_users SET
         full_name = $2,
         phone = COALESCE($3, phone),
         tax_number = COALESCE($4, tax_number),
         auth_user_id = COALESCE($5, auth_user_id),
         updated_at = NOW()
       WHERE id = $1
       RETURNING *`,
      [
        existing.id,
        input.full_name,
        input.phone ?? null,
        input.tax_number ?? null,
        input.auth_user_id ?? null,
      ],
    );
  }

  return queryRequired<MrpapsUserRow>(
    `INSERT INTO mrpaps_users (email, full_name, phone, tax_number, auth_user_id, role)
     VALUES ($1, $2, $3, $4, $5, 'customer')
     RETURNING *`,
    [
      email,
      input.full_name,
      input.phone ?? null,
      input.tax_number ?? null,
      input.auth_user_id ?? null,
    ],
  );
}

export async function listAddresses(userId: string): Promise<MrpapsAddressRow[]> {
  return query<MrpapsAddressRow>(
    `SELECT * FROM mrpaps_addresses WHERE user_id = $1 ORDER BY is_default DESC`,
    [userId],
  );
}

export async function saveAddress(input: {
  user_id: string;
  label: string;
  recipient_name: string;
  phone: string;
  address1: string;
  address2?: string | null;
  city: string;
  state_code: string;
  country_code: string;
  zip: string;
  is_default?: boolean;
}): Promise<MrpapsAddressRow> {
  if (input.is_default) {
    await query(`UPDATE mrpaps_addresses SET is_default = false WHERE user_id = $1`, [input.user_id]);
  }

  return queryRequired<MrpapsAddressRow>(
    `INSERT INTO mrpaps_addresses (
       user_id, label, recipient_name, phone, address1, address2, city, state_code, country_code, zip, is_default
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
     RETURNING *`,
    [
      input.user_id,
      input.label,
      input.recipient_name,
      input.phone,
      input.address1,
      input.address2 ?? null,
      input.city,
      input.state_code,
      input.country_code,
      input.zip,
      input.is_default ?? false,
    ],
  );
}
