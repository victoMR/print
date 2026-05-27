import { supabase } from '../lib/supabase.js';
import { logger } from '../lib/logger.js';
import type { PrintfulProductInsert, PrintfulProductRow } from './types.js';

function mapDbError(operation: string, error: { message: string; code?: string }): never {
  logger.error({ operation, code: error.code, message: error.message }, 'Supabase printful_products error');
  throw new Error(`printful_products.${operation}: ${error.message}`);
}

export async function upsertProducts(rows: PrintfulProductInsert[]): Promise<PrintfulProductRow[]> {
  if (rows.length === 0) return [];

  const { data, error } = await supabase
    .from('printful_products')
    .upsert(
      rows.map((row) => ({
        ...row,
        last_synced_at: row.last_synced_at ?? new Date().toISOString(),
      })),
      { onConflict: 'printful_sync_variant_id' },
    )
    .select();

  if (error) {
    mapDbError('upsert', error);
  }

  return data ?? [];
}

export async function listActiveProducts(): Promise<PrintfulProductRow[]> {
  const { data, error } = await supabase
    .from('printful_products')
    .select()
    .eq('status', 'active')
    .order('created_at', { ascending: false });

  if (error) {
    mapDbError('listActive', error);
  }

  return data ?? [];
}

export async function getProductBySyncVariantId(
  syncVariantId: number,
): Promise<PrintfulProductRow | null> {
  const { data, error } = await supabase
    .from('printful_products')
    .select()
    .eq('printful_sync_variant_id', syncVariantId)
    .maybeSingle();

  if (error) {
    mapDbError('getBySyncVariantId', error);
  }

  if (!data) return null;

  // Supabase puede devolver `bigint` como string (depende de cómo esté tipado).
  // Normalizamos a number para consumir consistentemente desde servicios.
  return {
    ...data,
    printful_sync_product_id: Number((data as any).printful_sync_product_id),
    printful_sync_variant_id: Number((data as any).printful_sync_variant_id),
    printful_catalog_variant_id: Number((data as any).printful_catalog_variant_id),
  } as PrintfulProductRow;
}

export async function getProductByInternalSku(internalSku: string): Promise<PrintfulProductRow | null> {
  const { data, error } = await supabase
    .from('printful_products')
    .select()
    .eq('internal_sku', internalSku)
    .maybeSingle();

  if (error) {
    mapDbError('getByInternalSku', error);
  }

  return data;
}

export async function deactivateProductBySyncVariantId(syncVariantId: number): Promise<void> {
  const { error } = await supabase
    .from('printful_products')
    .update({ status: 'inactive', last_synced_at: new Date().toISOString() })
    .eq('printful_sync_variant_id', syncVariantId);

  if (error) {
    mapDbError('deactivate', error);
  }
}

export async function deleteBySyncProductId(printfulSyncProductId: number): Promise<void> {
  const { error } = await supabase
    .from('printful_products')
    .delete()
    .eq('printful_sync_product_id', printfulSyncProductId);

  if (error) {
    mapDbError('deleteBySyncProductId', error);
  }
}
