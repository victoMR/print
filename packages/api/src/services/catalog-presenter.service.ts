import * as mrpapsCatalog from './mrpaps-catalog.service.js';
import type { MrpapsProductCategory } from '../db/mrpaps.types.js';

export const slugify = mrpapsCatalog.slugify;

export async function listPublicProducts(
  page = 1,
  limit = 24,
  category?: MrpapsProductCategory,
  search?: string,
) {
  const result = await mrpapsCatalog.listPublicProducts(page, limit, category, search);
  return {
    data: result.data.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      nameEn: p.nameEn,
      thumbnail: p.thumbnail,
      category: p.category,
      priceFromMxn: p.priceFromMxn,
      priceFromUsd: p.priceFromUsd,
      variantCount: p.variantCount,
    })),
    meta: result.meta,
  };
}

export async function getPublicProduct(idOrSlug: string) {
  const product = await mrpapsCatalog.getPublicProduct(idOrSlug);
  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    nameEn: product.nameEn,
    descriptionEn: product.descriptionEn,
    thumbnail: product.thumbnail,
    images: product.images,
    colorImages: product.colorImages,
    preview: product.preview ?? null,
    category: product.category,
    variants: product.variants.map((v) => ({
      variantId: v.variantId,
      syncVariantId: v.variantId,
      size: v.size,
      color: v.color,
      retailPriceMxn: v.retailPriceMxn,
      retailPriceUsd: v.retailPriceUsd,
      garmentColorHex: v.garmentColorHex,
      inStock: v.inStock,
      maxQuantity: v.maxQuantity,
    })),
  };
}
