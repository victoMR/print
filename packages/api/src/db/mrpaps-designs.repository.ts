import { supabase } from '../lib/supabase.js';
import type { MrpapsDesignRow } from './mrpaps.types.js';

export async function listDesigns(): Promise<MrpapsDesignRow[]> {
  const { data, error } = await supabase
    .from('mrpaps_designs')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return (data ?? []) as MrpapsDesignRow[];
}

export async function getDesignById(id: string): Promise<MrpapsDesignRow | null> {
  const { data, error } = await supabase
    .from('mrpaps_designs')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as MrpapsDesignRow | null;
}

export async function createDesign(input: {
  name: string;
  description?: string | null;
  file_url: string;
  thumbnail_url?: string | null;
  user_id?: string | null;
  tags?: string[];
  metadata?: Record<string, unknown>;
}): Promise<MrpapsDesignRow> {
  const { data, error } = await supabase
    .from('mrpaps_designs')
    .insert({
      name: input.name,
      description: input.description ?? null,
      file_url: input.file_url,
      thumbnail_url: input.thumbnail_url ?? input.file_url,
      user_id: input.user_id ?? null,
      tags: input.tags ?? [],
      metadata: input.metadata ?? {},
    })
    .select('*')
    .single();

  if (error) throw error;
  return data as MrpapsDesignRow;
}

export async function updateDesign(
  id: string,
  patch: Partial<{
    name: string;
    description: string | null;
    file_url: string;
    thumbnail_url: string | null;
    tags: string[];
  }>,
): Promise<MrpapsDesignRow> {
  const { data, error } = await supabase
    .from('mrpaps_designs')
    .update(patch)
    .eq('id', id)
    .select('*')
    .single();

  if (error) throw error;
  return data as MrpapsDesignRow;
}

export async function deleteDesign(id: string): Promise<void> {
  const { error } = await supabase.from('mrpaps_designs').delete().eq('id', id);
  if (error) throw error;
}
