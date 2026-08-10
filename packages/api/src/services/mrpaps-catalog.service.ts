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
import { marketForCurrency, stockForMarket, type Market } from '../lib/market.js';
import { BadRequestError, NotFoundError } from '../types/errors.js';
import { logger } from '../lib/logger.js';
import {
  normalizeAssetUrl,
  resolveProductImages,
  resolveProductThumbnail,
} from '../lib/product-images.js';

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
  const colorImagesMap = await productsRepo.batchListColorImagesByProductIds(
    pageProducts.map((p) => p.id),
  );

  const data = (
    await Promise.all(
      pageProducts.map(async (product) => {
        const variants = await productsRepo.listVariantsByProductId(product.id);
        if (variants.length === 0) return null;

        const prices = variants.map((v) => Number(v.retail_price_mxn)).filter((p) => p > 0);
        const priceFromMxn = prices.length ? Math.min(...prices).toFixed(2) : '0.00';
        const pricesUsd = variants
          .map((v) => (v.retail_price_usd !== null ? Number(v.retail_price_usd) : null))
          .filter((p): p is number => p !== null && p > 0);
        const priceFromUsd = pricesUsd.length ? Math.min(...pricesUsd).toFixed(2) : null;
        const colorImages = colorImagesMap.get(product.id) ?? [];

        return {
          id: product.id,
          slug: product.slug,
          name: product.name,
          nameEn: product.name_en,
          thumbnail: resolveProductThumbnail(product, colorImages),
          images: resolveProductImages(product),
          category: product.category,
          priceFromMxn,
          // null si ningún variante tiene precio en USD todavía — el frontend
          // debe ocultar el producto del catálogo en USD en ese caso.
          priceFromUsd,
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

async function getPublicProductUncached(idOrSlug: string, market: Market) {
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

  const images = resolveProductImages(product, colorImages);
  const thumbnail = resolveProductThumbnail(product, colorImages);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    nameEn: product.name_en,
    descriptionEn: product.description_en,
    thumbnail,
    images: images.length > 0 ? images : (thumbnail ? [thumbnail] : []),
    category: product.category,
    preview,
    colorImages: colorImages.map((ci) => ({
      color: ci.color_label,
      imageUrl: normalizeAssetUrl(ci.image_url),
    })),
    variants: variants.map((v) => {
      const stock = stockForMarket(v, market);
      return {
        variantId: v.id,
        size: v.size_label,
        color: v.color_label,
        retailPriceMxn: Number(v.retail_price_mxn).toFixed(2),
        // null si esta variante no tiene precio en USD todavía.
        retailPriceUsd: v.retail_price_usd !== null ? Number(v.retail_price_usd).toFixed(2) : null,
        garmentColorHex: v.garment_color_hex ?? product.default_garment_color ?? undefined,
        inStock: !isTrackedStock(v.is_pod) || stock > 0,
        maxQuantity: maxPurchasableQuantity(stock, v.is_pod),
      };
    }),
  };
}

export async function getPublicProduct(idOrSlug: string, market: Market = 'mx') {
  const key = catalogProductKey(idOrSlug, market);

  try {
    return await wrapCache(key, CacheTTL.catalogProduct(), () => getPublicProductUncached(idOrSlug, market));
  } catch (err) {
    if (err instanceof NotFoundError) throw err;
    logger.warn({ err, idOrSlug }, 'Catalog cache miss with error; retrying uncached');
    return getPublicProductUncached(idOrSlug, market);
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
  market: Market,
): void {
  if (quantity > MAX_CART_LINE_QUANTITY) {
    throw new BadRequestError(`Máximo ${MAX_CART_LINE_QUANTITY} unidades por artículo.`);
  }

  const stock = stockForMarket(variant, market);
  if (isTrackedStock(variant.is_pod) && quantity > stock) {
    throw new BadRequestError(
      `Solo hay ${stock} unidades disponibles de ${variantLabel(variant.size_label, variant.color_label)}.`,
    );
  }
}

/** Sincroniza líneas del carrito del cliente con precios y stock del catálogo. */
export async function syncCartLineItems(
  items: Array<{ variantId: string; quantity: number }>,
  market: Market = 'mx',
) {
  const synced = [];

  for (const item of items) {
    const variant = await productsRepo.getVariantById(item.variantId);
    if (!variant || variant.status !== 'active' || variant.product.status !== 'active') {
      continue;
    }

    const dbPriceUsd = variant.retail_price_usd !== null ? Number(variant.retail_price_usd).toFixed(2) : null;
    const stock = stockForMarket(variant, market);

    if (isTrackedStock(variant.is_pod) && stock < 1) {
      // Mantener en el carrito pero marcado como agotado — el cliente ve el aviso
      const dbPrice = Number(variant.retail_price_mxn).toFixed(2);
      synced.push({
        variantId: variant.id,
        productSlug: variant.product.slug,
        productName: variant.product.name,
        variantLabel: variantLabel(variant.size_label, variant.color_label),
        retailPriceMxn: dbPrice,
        retailPriceUsd: dbPriceUsd,
        thumbnail: variant.product.thumbnail_url,
        quantity: item.quantity,
        maxQuantity: 0,
        outOfStock: true,
      });
      continue;
    }

    const quantity = clampCartLineQuantity(item.quantity, stock, variant.is_pod);
    const dbPrice = Number(variant.retail_price_mxn).toFixed(2);

    synced.push({
      variantId: variant.id,
      productSlug: variant.product.slug,
      productName: variant.product.name,
      variantLabel: variantLabel(variant.size_label, variant.color_label),
      retailPriceMxn: dbPrice,
      retailPriceUsd: dbPriceUsd,
      thumbnail: variant.product.thumbnail_url,
      quantity,
      maxQuantity: maxPurchasableQuantity(stock, variant.is_pod),
      outOfStock: false,
    });
  }

  return synced;
}

export async function resolveLineItems(
  items: Array<{ variantId: string; quantity: number; retailPriceMxn?: string; retailPriceUsd?: string }>,
  currency: 'MXN' | 'USD' = 'MXN',
) {
  const resolved = [];
  const market = marketForCurrency(currency);

  for (const item of items) {
    const variant = await productsRepo.getVariantById(item.variantId);
    if (!variant || variant.status !== 'active' || variant.product.status !== 'active') {
      logger.warn(
        { variantId: item.variantId, found: Boolean(variant), status: variant?.status },
        'Carrito con variante inválida o inactiva',
      );
      throw new BadRequestError(STALE_CART_MESSAGE);
    }

    assertPurchasableQuantity(variant, item.quantity, market);

    const dbPriceMxn = Number(variant.retail_price_mxn).toFixed(2);
    if (item.retailPriceMxn && item.retailPriceMxn !== dbPriceMxn) {
      throw new BadRequestError('El precio del carrito no coincide con el catálogo. Actualiza la página.');
    }

    // El equivalente MXN se conserva siempre para contabilidad/CFDI, aun en
    // órdenes cobradas en USD — ver mrpaps-checkout.service.ts.
    let unitPriceUsd: number | null = variant.retail_price_usd !== null ? Number(variant.retail_price_usd) : null;

    if (currency === 'USD') {
      if (variant.retail_price_usd === null) {
        throw new BadRequestError(
          `${variantLabel(variant.size_label, variant.color_label)} no está disponible en USD. Quítalo del carrito.`,
        );
      }
      const dbPriceUsd = Number(variant.retail_price_usd).toFixed(2);
      if (item.retailPriceUsd && item.retailPriceUsd !== dbPriceUsd) {
        throw new BadRequestError('El precio del carrito no coincide con el catálogo. Actualiza la página.');
      }
      unitPriceUsd = Number(dbPriceUsd);
    }

    resolved.push({
      variant,
      quantity: item.quantity,
      unitPriceMxn: Number(dbPriceMxn),
      unitPriceUsd,
    });
  }

  return resolved;
}
