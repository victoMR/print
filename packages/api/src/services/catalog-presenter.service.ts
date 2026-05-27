import * as catalogService from './catalog.service.js';
import * as productsRepo from '../db/products.repository.js';
import { NotFoundError } from '../types/errors.js';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

interface PublicProductSummary {
  id: string;
  slug: string;
  name: string;
  thumbnail: string;
  priceFromMxn: string;
  variantCount: number;
}

interface PublicProductVariant {
  syncVariantId: number;
  size: string;
  color: string;
  retailPriceMxn: string;
  inStock: true;
}

interface PublicProductDetail {
  id: string;
  slug: string;
  name: string;
  description: string;
  thumbnail: string;
  variants: PublicProductVariant[];
}

function parseVariantLabel(name: string): { size: string; color: string } {
  const parts = name.split('/').map((p) => p.trim());
  if (parts.length >= 3) {
    return { color: parts[parts.length - 2] ?? 'Único', size: parts[parts.length - 1] ?? 'Única' };
  }
  if (parts.length === 2) {
    return { color: parts[0] ?? 'Único', size: parts[1] ?? 'Única' };
  }
  return { color: 'Único', size: name || 'Única' };
}

function minRetailFromStoreDetail(
  detail: Awaited<ReturnType<typeof catalogService.getStoreProduct>>,
): string | null {
  const prices = detail.sync_variants
    .map((v) => Number.parseFloat(v.retail_price))
    .filter((n) => Number.isFinite(n) && n > 0);
  if (prices.length === 0) return null;
  return Math.min(...prices).toFixed(2);
}

export async function listPublicProducts(page = 1, limit = 24): Promise<{
  data: PublicProductSummary[];
  meta: { page: number; limit: number; total: number };
}> {
  const safeLimit = Math.min(Math.max(limit, 1), 48);
  const safePage = Math.max(page, 1);

  const [storeProducts, localVariants] = await Promise.all([
    catalogService.listStoreProducts(),
    productsRepo.listActiveProducts(),
  ]);

  const priceBySyncProduct = new Map<number, number>();

  for (const variant of localVariants) {
    const price = Number(variant.retail_price_mxn);
    if (!Number.isFinite(price) || price <= 0) continue;
    const current = priceBySyncProduct.get(variant.printful_sync_product_id);
    if (current === undefined || price < current) {
      priceBySyncProduct.set(variant.printful_sync_product_id, price);
    }
  }

  const total = storeProducts.length;
  const start = (safePage - 1) * safeLimit;
  const pageProducts = storeProducts.slice(start, start + safeLimit);

  const needsPrintfulFallback = pageProducts.filter((p) => {
    const db = priceBySyncProduct.get(p.id);
    return db === undefined || !Number.isFinite(db) || db <= 0;
  });

  const printfulMinByProductId = new Map<number, string>();
  await Promise.all(
    needsPrintfulFallback.map(async (p) => {
      try {
        const detail = await catalogService.getStoreProduct(p.id);
        const minStr = minRetailFromStoreDetail(detail);
        if (minStr) printfulMinByProductId.set(p.id, minStr);
      } catch {
        /* omit */
      }
    }),
  );

  const data = pageProducts.map((product) => {
    const db = priceBySyncProduct.get(product.id);
    const fromDb = db !== undefined && Number.isFinite(db) && db > 0 ? db.toFixed(2) : null;
    const fromPf = printfulMinByProductId.get(product.id) ?? null;
    const priceFromMxn = fromDb ?? fromPf ?? '0.00';

    return {
      id: product.external_id,
      slug: slugify(product.external_id),
      name: product.name,
      thumbnail: product.thumbnail_url,
      priceFromMxn,
      variantCount: product.variants,
    };
  });

  return { data, meta: { page: safePage, limit: safeLimit, total } };
}

export async function getPublicProduct(idOrSlug: string): Promise<PublicProductDetail> {
  const storeProducts = await catalogService.listStoreProducts();
  const match = storeProducts.find(
    (p) => p.external_id === idOrSlug || slugify(p.external_id) === idOrSlug,
  );

  if (!match) {
    throw new NotFoundError('Producto no encontrado');
  }

  const [detail, localVariants] = await Promise.all([
    catalogService.getStoreProduct(match.id),
    productsRepo.listActiveProducts(),
  ]);

  const priceBySyncVariant = new Map<number, string>();
  for (const row of localVariants) {
    if (row.printful_sync_product_id === match.id) {
      priceBySyncVariant.set(
        row.printful_sync_variant_id,
        Number(row.retail_price_mxn).toFixed(2),
      );
    }
  }

  const variants: PublicProductVariant[] = detail.sync_variants.map((variant) => {
    const label = parseVariantLabel(String((variant as { name?: string }).name ?? variant.external_id));
    return {
      syncVariantId: variant.id,
      size: label.size,
      color: label.color,
      retailPriceMxn: priceBySyncVariant.get(variant.id) ?? Number.parseFloat(variant.retail_price).toFixed(2),
      inStock: true,
    };
  });

  return {
    id: match.external_id,
    slug: slugify(match.external_id),
    name: match.name,
    description: `Producto impreso bajo demanda desde Tijuana. ${variants.length} variantes disponibles.`,
    thumbnail: match.thumbnail_url,
    variants,
  };
}
