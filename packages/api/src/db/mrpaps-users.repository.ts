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
