import { supabase } from '../lib/supabase.js';
import type { MrpapsGarmentTemplateRow } from './mrpaps.types.js';

export async function listActiveTemplates(): Promise<MrpapsGarmentTemplateRow[]> {
  const { data, error } = await supabase
    .from('mrpaps_garment_templates')
    .select('*')
    .eq('status', 'active')
    .order('sort_order');

  if (error) throw error;
  return (data ?? []) as MrpapsGarmentTemplateRow[];
}

export async function getTemplateById(id: string): Promise<MrpapsGarmentTemplateRow | null> {
  const { data, error } = await supabase
    .from('mrpaps_garment_templates')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as MrpapsGarmentTemplateRow | null;
}

export async function getTemplateBySlug(slug: string): Promise<MrpapsGarmentTemplateRow | null> {
  const { data, error } = await supabase
    .from('mrpaps_garment_templates')
    .select('*')
    .eq('slug', slug)
    .maybeSingle();

  if (error) throw error;
  return data as MrpapsGarmentTemplateRow | null;
}
