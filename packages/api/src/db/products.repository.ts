import { query, queryOne, queryRequired } from '../lib/db-helper.js';
import { logger } from '../lib/logger.js';
import type { PrintfulProductInsert, PrintfulProductRow } from './types.js';

function mapDbError(operation: string, error: Error): never {
  logger.error({ operation, message: error.message }, 'PostgreSQL printful_products error');
  throw new Error(`printful_products.${operation}: ${error.message}`);
}

export async function upsertProducts(rows: PrintfulProductInsert[]): Promise<PrintfulProductRow[]> {
  if (rows.length === 0) return [];

  const results: PrintfulProductRow[] = [];
  for (const row of rows) {
    try {
      const saved = await queryRequired<PrintfulProductRow>(
        `INSERT INTO printful_products (
           internal_sku, printful_sync_product_id, printful_sync_variant_id,
           printful_catalog_variant_id, retail_price_mxn, printful_cost_usd, status, last_synced_at
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, COALESCE($8, NOW()))
         ON CONFLICT (printful_sync_variant_id) DO UPDATE SET
           internal_sku = EXCLUDED.internal_sku,
           printful_sync_product_id = EXCLUDED.printful_sync_product_id,
           printful_catalog_variant_id = EXCLUDED.printful_catalog_variant_id,
           retail_price_mxn = EXCLUDED.retail_price_mxn,
           printful_cost_usd = EXCLUDED.printful_cost_usd,
           status = EXCLUDED.status,
           last_synced_at = EXCLUDED.last_synced_at
         RETURNING *`,
        [
          row.internal_sku,
          row.printful_sync_product_id,
          row.printful_sync_variant_id,
          row.printful_catalog_variant_id,
          row.retail_price_mxn,
          row.printful_cost_usd,
          row.status,
          row.last_synced_at ?? new Date().toISOString(),
        ],
      );
      results.push(saved);
    } catch (err) {
      mapDbError('upsert', err instanceof Error ? err : new Error(String(err)));
    }
  }
  return results;
}

export async function listActiveProducts(): Promise<PrintfulProductRow[]> {
  return query<PrintfulProductRow>(
    `SELECT * FROM printful_products WHERE status = 'active' ORDER BY created_at DESC`,
  );
}

export async function getProductBySyncVariantId(
  syncVariantId: number,
): Promise<PrintfulProductRow | null> {
  const data = await queryOne<PrintfulProductRow>(
    `SELECT * FROM printful_products WHERE printful_sync_variant_id = $1`,
    [syncVariantId],
  );
  if (!data) return null;

  return {
    ...data,
    printful_sync_product_id: Number(data.printful_sync_product_id),
    printful_sync_variant_id: Number(data.printful_sync_variant_id),
    printful_catalog_variant_id: Number(data.printful_catalog_variant_id),
  };
}

export async function getProductByInternalSku(
  internalSku: string,
): Promise<PrintfulProductRow | null> {
  return queryOne<PrintfulProductRow>(
    `SELECT * FROM printful_products WHERE internal_sku = $1`,
    [internalSku],
  );
}

export async function deactivateProductBySyncVariantId(syncVariantId: number): Promise<void> {
  await query(
    `UPDATE printful_products SET status = 'inactive', last_synced_at = NOW()
     WHERE printful_sync_variant_id = $1`,
    [syncVariantId],
  );
}

export async function deleteBySyncProductId(printfulSyncProductId: number): Promise<void> {
  await query(`DELETE FROM printful_products WHERE printful_sync_product_id = $1`, [
    printfulSyncProductId,
  ]);
}
