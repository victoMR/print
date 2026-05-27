import { printful } from '../lib/printful.js';
import type { PrintfulSyncProduct } from '../types/printful.types.js';
import type { SyncProductInputType } from '../schemas/order.schema.js';
import { callPrintful } from './printful.helper.js';
import { usdToMxn } from '../lib/banxico.js';
import * as productsRepo from '../db/products.repository.js';
import type { PrintfulProductInsert } from '../db/types.js';
import { logger } from '../lib/logger.js';

interface StoreProductDetail {
  sync_product: {
    id: number;
    external_id: string;
    name?: string;
    thumbnail?: string;
  };
  sync_variants: Array<{
    id: number;
    external_id: string;
    variant_id: number;
    retail_price: string;
    price?: string;
  }>;
}

export async function listStoreProducts(): Promise<PrintfulSyncProduct[]> {
  return callPrintful(
    () => printful.get('/store/products'),
    { operation: 'listStoreProducts' },
  );
}

export async function getStoreProduct(id: number): Promise<StoreProductDetail> {
  const raw = await callPrintful(
    () => printful.get(`/store/products/${id}`),
    { operation: 'getStoreProduct', internalId: String(id) },
  );
  return normalizeStoreProductDetail(raw);
}

/** Sync Variant ID (store) → catálogo `variant_id` (p. ej. para POST /shipping/rates). */
export async function getStoreSyncVariantById(syncVariantId: number): Promise<{ variant_id: number }> {
  const raw = await callPrintful(
    () => printful.get(`/store/variants/${syncVariantId}`),
    { operation: 'getStoreSyncVariantById', internalId: String(syncVariantId) },
  );
  const r = raw as Record<string, unknown>;
  const variant_id = Number(r.variant_id);
  if (!Number.isFinite(variant_id) || variant_id <= 0) {
    throw new Error('Printful sync variant response missing variant_id');
  }
  return { variant_id };
}

function pickThumbnailFromSyncProduct(sp: Record<string, unknown>): string | undefined {
  if (typeof sp.thumbnail === 'string' && sp.thumbnail.trim()) return sp.thumbnail;
  if (typeof sp.thumbnail_url === 'string' && sp.thumbnail_url.trim()) return sp.thumbnail_url;
  if (typeof sp.image === 'string' && sp.image.trim()) return sp.image;
  return undefined;
}

function normalizeStoreProductDetail(raw: unknown): StoreProductDetail {
  const r = raw as Record<string, unknown>;

  let syncProductRaw = r.sync_product as Record<string, unknown> | undefined;

  if (!syncProductRaw?.id && typeof r.id === 'number') {
    syncProductRaw = r as Record<string, unknown>;
  }

  if (!syncProductRaw?.id) {
    throw new Error('Printful response missing sync_product');
  }

  const syncProduct: StoreProductDetail['sync_product'] = {
    id: Number(syncProductRaw.id),
    external_id: String(syncProductRaw.external_id ?? ''),
    name: typeof syncProductRaw.name === 'string' ? syncProductRaw.name : undefined,
    thumbnail: pickThumbnailFromSyncProduct(syncProductRaw),
  };

  const variantsRaw = r.sync_variants ?? r.variants;
  const syncVariants = Array.isArray(variantsRaw)
    ? (variantsRaw as StoreProductDetail['sync_variants'])
    : [];

  return { sync_product: syncProduct, sync_variants: syncVariants };
}

export async function createSyncProduct(input: SyncProductInputType): Promise<unknown> {
  const payload = {
    sync_product: {
      external_id: input.external_id,
      name: input.name,
      thumbnail: input.thumbnail,
    },
    sync_variants: input.variants.map((v) => ({
      external_id: v.external_id,
      variant_id: v.variant_id,
      retail_price: v.retail_price,
      ...(v.sku && { sku: v.sku }),
      files: v.files,
    })),
  };

  const result = await callPrintful(
    () => printful.post('/store/products', payload),
    { operation: 'createSyncProduct', internalId: input.external_id },
  );

  const detail = await resolveStoreProductDetail(result);
  await persistStoreProductDetail(detail, input);
  return detail;
}

/** POST /store/products a veces no devuelve sync_variants[]; GET detalle si falta. */
async function resolveStoreProductDetail(result: unknown): Promise<StoreProductDetail> {
  const normalized = normalizeStoreProductDetail(result);

  if (normalized.sync_variants.length > 0) {
    return normalized;
  }

  logger.info(
    { syncProductId: normalized.sync_product.id },
    'Fetching store product detail after create',
  );

  return getStoreProduct(normalized.sync_product.id);
}

export async function listCatalogProducts(categoryId?: string): Promise<unknown> {
  const params = categoryId ? { category_id: categoryId } : undefined;
  return callPrintful(
    () => printful.get('/products', { params }),
    { operation: 'listCatalogProducts' },
  );
}

export async function getCatalogProduct(productId: number): Promise<unknown> {
  return callPrintful(
    () => printful.get(`/products/${productId}`),
    { operation: 'getCatalogProduct', internalId: String(productId) },
  );
}

export async function listLocalProducts() {
  return productsRepo.listActiveProducts();
}

export async function getLocalProductBySyncVariantId(syncVariantId: number) {
  return productsRepo.getProductBySyncVariantId(syncVariantId);
}

/**
 * Sincroniza productos de Printful Store → printful_products (job diario).
 */
export async function syncProductsToDatabase(): Promise<number> {
  const summaries = await listStoreProducts();
  const rows: PrintfulProductInsert[] = [];

  for (const summary of summaries) {
    try {
      const detail = await getStoreProduct(summary.id);
      const detailRows = await mapStoreProductToRows(detail);
      rows.push(...detailRows);
    } catch (err) {
      logger.error({ productId: summary.id, err }, 'Error syncing store product to Supabase');
    }
  }

  if (rows.length > 0) {
    await productsRepo.upsertProducts(rows);
  }

  logger.info({ variants: rows.length, products: summaries.length }, 'Catalog synced to Supabase');
  return rows.length;
}

async function persistStoreProductDetail(
  detail: StoreProductDetail,
  input?: SyncProductInputType,
): Promise<void> {
  const rows = await mapStoreProductToRows(detail, input);
  if (rows.length > 0) {
    await productsRepo.upsertProducts(rows);
  }
}

async function mapStoreProductToRows(
  detail: StoreProductDetail,
  input?: SyncProductInputType,
): Promise<PrintfulProductInsert[]> {
  const inputByExternalId = new Map(
    input?.variants.map((v) => [v.external_id, v]) ?? [],
  );

  const rows: PrintfulProductInsert[] = [];
  const variants = Array.isArray(detail.sync_variants) ? detail.sync_variants : [];

  if (variants.length === 0) {
    logger.warn(
      { syncProductId: detail.sync_product?.id },
      'No sync_variants in store product detail',
    );
    return rows;
  }

  for (const variant of variants) {
    const inputVariant = inputByExternalId.get(variant.external_id);
    const retailUsd = Number.parseFloat(variant.retail_price);
    const costUsd = Number.parseFloat(variant.price ?? variant.retail_price);

    let retailMxn: number;
    if (inputVariant) {
      // Precio definido al crear sync product (asumimos MXN en tienda)
      retailMxn = Number.parseFloat(inputVariant.retail_price);
    } else {
      retailMxn = Number.parseFloat(await usdToMxn(retailUsd));
    }

    rows.push({
      internal_sku: inputVariant?.sku ?? variant.external_id,
      printful_sync_product_id: detail.sync_product.id,
      printful_sync_variant_id: variant.id,
      printful_catalog_variant_id: variant.variant_id,
      retail_price_mxn: Number(retailMxn.toFixed(2)),
      printful_cost_usd: Number(costUsd.toFixed(2)),
      status: 'active',
    });
  }

  return rows;
}

export interface SyncProductUpdateInput {
  name?: string;
  thumbnail?: string;
  variants?: Array<{
    syncVariantId: number;
    externalId?: string;
    retailPrice?: string;
    files?: Array<{ type: string; url: string }>;
  }>;
}

export async function updateSyncProduct(
  syncProductId: number,
  input: SyncProductUpdateInput,
): Promise<unknown> {
  const detail = await getStoreProduct(syncProductId);
  const overrides = new Map((input.variants ?? []).map((v) => [v.syncVariantId, v]));

  const sync_variants = detail.sync_variants.map((sv) => {
    const o = overrides.get(sv.id);
    const row: Record<string, unknown> = {
      id: sv.id,
      external_id: o?.externalId ?? sv.external_id,
      variant_id: sv.variant_id,
      retail_price: o?.retailPrice ?? sv.retail_price,
    };
    if (o?.files && o.files.length > 0) {
      row.files = o.files;
    }
    return row;
  });

  const sp = detail.sync_product;
  const thumbnail = input.thumbnail ?? sp.thumbnail;
  const name = input.name ?? sp.name;
  if (!thumbnail?.trim()) {
    throw new Error('Falta thumbnail: inclúyelo en el cuerpo o verifica el producto en Printful');
  }
  if (!name?.trim()) {
    throw new Error('Falta nombre: inclúyelo en el cuerpo o verifica el producto en Printful');
  }

  const payload = {
    sync_product: {
      external_id: sp.external_id,
      name,
      thumbnail,
    },
    sync_variants,
  };

  const result = await callPrintful(
    () => printful.put(`/store/products/${syncProductId}`, payload),
    { operation: 'updateSyncProduct', internalId: String(syncProductId) },
  );

  const resolved = await resolveStoreProductDetail(result);
  await persistStoreProductDetail(resolved);
  return resolved;
}

export async function deleteSyncProduct(syncProductId: number): Promise<void> {
  await callPrintful(
    () => printful.delete(`/store/products/${syncProductId}`),
    { operation: 'deleteSyncProduct', internalId: String(syncProductId) },
  );
  await productsRepo.deleteBySyncProductId(syncProductId);
}
