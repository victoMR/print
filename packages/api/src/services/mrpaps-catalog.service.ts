import * as productsRepo from '../db/mrpaps-products.repository.js';
import * as templatesRepo from '../db/mrpaps-garment-templates.repository.js';
import type { MrpapsProductCategory } from '../db/mrpaps.types.js';
import { catalogProductsQuerySchema } from '../schemas/api.schema.js';
import { productCategorySchema } from '../lib/product-categories.js';
import { CacheTTL, catalogListKey, catalogProductKey } from '../lib/cache-keys.js';
import { wrapCache } from '../lib/cache.js';
import {
  clampCartLineQuantity,
  isTrackedStock,
  MAX_CART_LINE_QUANTITY,
  maxPurchasableQuantity,
} from '../lib/cart-limits.js';
import { BadRequestError, NotFoundError } from '../types/errors.js';
import { logger } from '../lib/logger.js';
import { resolveProductImages } from '../lib/product-images.js';

const STALE_CART_MESSAGE =
  'Tu carrito tiene productos que ya no existen en el catálogo. Vacía el carrito y vuelve a agregar los artículos desde la tienda.';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

async function buildProductPreview(product: Awaited<ReturnType<typeof productsRepo.getProductById>>) {
  const comp = product?.composition as { views?: Record<string, unknown> } | null | undefined;
  const hasViews = Boolean(comp?.views && Object.keys(comp.views).length > 0);

  if (!product?.template_id || !hasViews) {
    return null;
  }

  const template = await templatesRepo.getTemplateById(product.template_id);
  if (!template || template.status !== 'active') return null;

  return {
    garmentColor: product.default_garment_color,
    composition: product.composition,
    template: {
      id: template.id,
      slug: template.slug,
      name: template.name,
      garmentType: template.garment_type,
      views: template.views,
    },
  };
}

async function listPublicProductsUncached(
  page: number,
  limit: number,
  category?: MrpapsProductCategory,
  search?: string,
) {
  const products = await productsRepo.listActiveProducts(category, search);
  const total = products.length;
  const start = (page - 1) * limit;
  const pageProducts = products.slice(start, start + limit);

  const data = (
    await Promise.all(
      pageProducts.map(async (product) => {
        const variants = await productsRepo.listVariantsByProductId(product.id);
        if (variants.length === 0) return null;

        const prices = variants.map((v) => Number(v.retail_price_mxn)).filter((p) => p > 0);
        const priceFromMxn = prices.length ? Math.min(...prices).toFixed(2) : '0.00';

        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          thumbnail: resolveProductImages(product)[0] ?? product.thumbnail_url,
          images: resolveProductImages(product),
          category: product.category,
          priceFromMxn,
          variantCount: variants.length,
          hasComposition: Boolean(
            product.template_id &&
            (product.composition as { views?: Record<string, unknown> } | null)?.views &&
            Object.keys((product.composition as { views: Record<string, unknown> }).views).length > 0,
          ),
        };
      }),
    )
  ).filter((p): p is NonNullable<typeof p> => p !== null);

  return { data, meta: { page, limit, total } };
}

export async function listPublicProducts(
  page = 1,
  limit = 24,
  category?: MrpapsProductCategory,
  search?: string,
) {
  const safeLimit = Math.min(Math.max(limit, 1), 48);
  const safePage = Math.max(page, 1);
  const normalizedSearch = search?.trim() || undefined;

  return wrapCache(
    catalogListKey(category, normalizedSearch, safePage, safeLimit),
    CacheTTL.catalogList(),
    () => listPublicProductsUncached(safePage, safeLimit, category, normalizedSearch),
  );
}

async function getPublicProductUncached(idOrSlug: string) {
  let product = await productsRepo.getProductBySlug(idOrSlug);
  if (!product) {
    product = await productsRepo.getProductById(idOrSlug);
  }
  if (!product || product.status !== 'active') {
    throw new NotFoundError('Producto no encontrado');
  }

  const [variants, colorImages, preview] = await Promise.all([
    productsRepo.listVariantsByProductId(product.id),
    productsRepo.listColorImagesByProductId(product.id),
    buildProductPreview(product),
  ]);

  const images = resolveProductImages(product);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    thumbnail: images[0] ?? product.thumbnail_url,
    images,
    category: product.category,
    preview,
    colorImages: colorImages.map((ci) => ({ color: ci.color_label, imageUrl: ci.image_url })),
    variants: variants.map((v) => ({
      variantId: v.id,
      size: v.size_label,
      color: v.color_label,
      retailPriceMxn: Number(v.retail_price_mxn).toFixed(2),
      garmentColorHex: v.garment_color_hex ?? product.default_garment_color ?? '#FFFFFF',
      inStock: !isTrackedStock(v.stock_quantity) || v.stock_quantity > 0,
      maxQuantity: maxPurchasableQuantity(v.stock_quantity),
    })),
  };
}

export async function getPublicProduct(idOrSlug: string) {
  const key = catalogProductKey(idOrSlug);

  try {
    return await wrapCache(key, CacheTTL.catalogProduct(), () => getPublicProductUncached(idOrSlug));
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    logger.warn({ err, idOrSlug }, 'Catalog cache miss with error; retrying uncached');
    return getPublicProductUncached(idOrSlug);
  }
}

export function parseProductCategoryQuery(value: unknown): MrpapsProductCategory | undefined {
  if (typeof value !== 'string' || !value.trim()) return undefined;
  const parsed = productCategorySchema.safeParse(value.trim());
  if (!parsed.success) throw new BadRequestError('Categoría de producto inválida');
  return parsed.data;
}

export function parseCatalogProductsQuery(query: Record<string, unknown>) {
  const parsed = catalogProductsQuerySchema.safeParse(query);
  if (!parsed.success) {
    throw new BadRequestError('Parámetros de catálogo inválidos');
  }
  return parsed.data;
}

function variantLabel(size: string, color: string): string {
  return `${size} / ${color}`;
}

function assertPurchasableQuantity(
  variant: Awaited<ReturnType<typeof productsRepo.getVariantById>> & object,
  quantity: number,
): void {
  if (quantity > MAX_CART_LINE_QUANTITY) {
    throw new BadRequestError(`Máximo ${MAX_CART_LINE_QUANTITY} unidades por artículo.`);
  }

  if (isTrackedStock(variant.stock_quantity) && quantity > variant.stock_quantity) {
    throw new BadRequestError(
      `Solo hay ${variant.stock_quantity} unidades disponibles de ${variantLabel(variant.size_label, variant.color_label)}.`,
    );
  }
}

/** Sincroniza líneas del carrito del cliente con precios y stock del catálogo. */
export async function syncCartLineItems(
  items: Array<{ variantId: string; quantity: number }>,
) {
  const synced = [];

  for (const item of items) {
    const variant = await productsRepo.getVariantById(item.variantId);
    if (!variant || variant.status !== 'active' || variant.product.status !== 'active') {
      continue;
    }

    if (isTrackedStock(variant.stock_quantity) && variant.stock_quantity < 1) {
      continue;
    }

    const quantity = clampCartLineQuantity(item.quantity, variant.stock_quantity);
    const dbPrice = Number(variant.retail_price_mxn).toFixed(2);

    synced.push({
      variantId: variant.id,
      productSlug: variant.product.slug,
      productName: variant.product.name,
      variantLabel: variantLabel(variant.size_label, variant.color_label),
      retailPriceMxn: dbPrice,
      thumbnail: variant.product.thumbnail_url,
      quantity,
      maxQuantity: maxPurchasableQuantity(variant.stock_quantity),
    });
  }

  return synced;
}

export async function resolveLineItems(
  items: Array<{ variantId: string; quantity: number; retailPriceMxn?: string }>,
) {
  const resolved = [];

  for (const item of items) {
    const variant = await productsRepo.getVariantById(item.variantId);
    if (!variant || variant.status !== 'active' || variant.product.status !== 'active') {
      logger.warn(
        { variantId: item.variantId, found: Boolean(variant), status: variant?.status },
        'Carrito con variante inválida o inactiva',
      );
      throw new BadRequestError(STALE_CART_MESSAGE);
    }

    assertPurchasableQuantity(variant, item.quantity);

    const dbPrice = Number(variant.retail_price_mxn).toFixed(2);
    if (item.retailPriceMxn && item.retailPriceMxn !== dbPrice) {
      throw new BadRequestError('El precio del carrito no coincide con el catálogo. Actualiza la página.');
    }

    resolved.push({
      variant,
      quantity: item.quantity,
      unitPriceMxn: Number(dbPrice),
    });
  }

  return resolved;
}
