import { printful } from '../lib/printful.js';
import type { PrintfulShippingRate } from '../types/printful.types.js';
import type { ShippingRatesInputType } from '../schemas/order.schema.js';
import { callPrintful } from './printful.helper.js';
import * as productsRepo from '../db/products.repository.js';
import * as catalogService from './catalog.service.js';
import { NotFoundError } from '../types/errors.js';

async function resolveCatalogVariantId(syncVariantId: number): Promise<number> {
  // Guard por rango: en Postgres `INT` es 32-bit, y los IDs de Printful a veces
  // vienen mayores (provocan "out of range for type integer").
  // Mientras aplicamos migración a BIGINT, evitamos que Supabase reviente.
  const PG_INT_MAX = 2_147_483_647;

  if (syncVariantId <= PG_INT_MAX) {
    const row = await productsRepo.getProductBySyncVariantId(syncVariantId);
    if (row) {
      const catalogVariantId = Number(row.printful_catalog_variant_id);
      if (Number.isFinite(catalogVariantId) && catalogVariantId > 0) return catalogVariantId;
    }
  }

  try {
    const { variant_id } = await catalogService.getStoreSyncVariantById(syncVariantId);
    return variant_id;
  } catch (err) {
    if (err instanceof NotFoundError) {
      throw new NotFoundError(`Variante del carrito (${syncVariantId}) no existe en Printful`);
    }
    throw err;
  }
}

export async function getShippingRates(
  input: ShippingRatesInputType,
): Promise<PrintfulShippingRate[]> {
  const items = await Promise.all(
    input.items.map(async (item) => {
      const variant_id = await resolveCatalogVariantId(item.sync_variant_id);
      return {
        variant_id,
        sync_variant_id: item.sync_variant_id,
        quantity: item.quantity,
        ...(item.retail_price && { retail_price: item.retail_price }),
      };
    }),
  );

  return callPrintful(
    () => printful.post('/shipping/rates', {
      recipient: input.recipient,
      items,
      currency: input.currency,
    }),
    { operation: 'getShippingRates' },
  );
}
