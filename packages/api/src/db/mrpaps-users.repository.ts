import { supabase } from '../lib/supabase.js';
import type { MrpapsAddressRow, MrpapsUserRow } from './mrpaps.types.js';

export async function findUserByEmail(email: string): Promise<MrpapsUserRow | null> {
  const { data, error } = await supabase
    .from('mrpaps_users')
    .select('*')
    .ilike('email', email.trim().toLowerCase())
    .maybeSingle();

  if (error) throw error;
  return data as MrpapsUserRow | null;
}

/** Incluye password_hash — solo uso interno de auth. */
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
    const { data, error } = await supabase
      .from('mrpaps_users')
      .update({
        full_name: input.full_name,
        role: 'admin',
        password_hash: input.password_hash,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return data as MrpapsUserRow;
  }

  const { data, error } = await supabase
    .from('mrpaps_users')
    .insert({
      email,
      full_name: input.full_name,
      role: 'admin',
      password_hash: input.password_hash,
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as MrpapsUserRow;
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
    const { data, error } = await supabase
      .from('mrpaps_users')
      .update({ full_name: input.full_name, phone: input.phone, password_hash: input.password_hash })
      .eq('id', existing.id)
      .select('*')
      .single();
    if (error) throw error;
    return data as MrpapsUserRow;
  }

  const { data, error } = await supabase
    .from('mrpaps_users')
    .insert({ email, full_name: input.full_name, phone: input.phone, role: 'customer', password_hash: input.password_hash })
    .select('*')
    .single();
  if (error) throw error;
  return data as MrpapsUserRow;
}

export async function updateCustomer(
  userId: string,
  patch: { full_name?: string; phone?: string | null },
): Promise<MrpapsUserRow> {
  const { data, error } = await supabase
    .from('mrpaps_users')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as MrpapsUserRow;
}

export async function deleteAddress(addressId: string, userId: string): Promise<void> {
  const { error } = await supabase
    .from('mrpaps_addresses')
    .delete()
    .eq('id', addressId)
    .eq('user_id', userId);
  if (error) throw error;
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
    await supabase.from('mrpaps_addresses').update({ is_default: false }).eq('user_id', userId);
  }
  const { data, error } = await supabase
    .from('mrpaps_addresses')
    .update({ ...patch, updated_at: new Date().toISOString() })
    .eq('id', addressId)
    .eq('user_id', userId)
    .select('*')
    .single();
  if (error) throw error;
  return data as MrpapsAddressRow;
}

/** Vincula pedidos huérfanos (sin user_id) creados con el mismo correo antes del fix de checkout. */
export async function linkOrphanOrdersByEmail(userId: string, email: string): Promise<void> {
  const normalized = email.trim().toLowerCase();
  const { error } = await supabase
    .from('mrpaps_orders')
    .update({ user_id: userId })
    .is('user_id', null)
    .ilike('customer_email', normalized);
  if (error) throw error;
}

export async function listOrdersByUser(
  userId: string,
  email?: string,
): Promise<{ id: string; public_id: string; order_number: string; status: string; total_mxn: string; ordered_at: string; item_count: number }[]> {
  if (email) {
    await linkOrphanOrdersByEmail(userId, email);
  }

  const { data: orders, error: oErr } = await supabase
    .from('mrpaps_orders')
    .select('id, public_id, order_number, status, total_mxn, ordered_at')
    .eq('user_id', userId)
    .order('ordered_at', { ascending: false });
  if (oErr) throw oErr;

  if (!orders || orders.length === 0) return [];

  const orderIds = orders.map((o: { id: string }) => o.id);
  const { data: items, error: iErr } = await supabase
    .from('mrpaps_order_items')
    .select('order_id, quantity')
    .in('order_id', orderIds);
  if (iErr) throw iErr;

  const countByOrder = new Map<string, number>();
  for (const item of (items ?? []) as { order_id: string; quantity: number }[]) {
    countByOrder.set(item.order_id, (countByOrder.get(item.order_id) ?? 0) + item.quantity);
  }

  return orders.map((o: { id: string; public_id: string; order_number: string; status: string; total_mxn: string; ordered_at: string }) => ({
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
    const { data, error } = await supabase
      .from('mrpaps_users')
      .update({
        full_name: input.full_name,
        phone: input.phone ?? existing.phone,
        tax_number: input.tax_number ?? existing.tax_number,
        auth_user_id: input.auth_user_id ?? existing.auth_user_id,
      })
      .eq('id', existing.id)
      .select('*')
      .single();

    if (error) throw error;
    return data as MrpapsUserRow;
  }

  const { data, error } = await supabase
    .from('mrpaps_users')
    .insert({
      email,
      full_name: input.full_name,
      phone: input.phone ?? null,
      tax_number: input.tax_number ?? null,
      auth_user_id: input.auth_user_id ?? null,
      role: 'customer',
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as MrpapsUserRow;
}

export async function listAddresses(userId: string): Promise<MrpapsAddressRow[]> {
  const { data, error } = await supabase
    .from('mrpaps_addresses')
    .select('*')
    .eq('user_id', userId)
    .order('is_default', { ascending: false });

  if (error) throw error;
  return (data ?? []) as MrpapsAddressRow[];
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
    await supabase
      .from('mrpaps_addresses')
      .update({ is_default: false })
      .eq('user_id', input.user_id);
  }

  const { data, error } = await supabase
    .from('mrpaps_addresses')
    .insert(input)
    .select('*')
    .single();

  if (error) throw error;
  return data as MrpapsAddressRow;
}
