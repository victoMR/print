import * as mrpapsCatalog from './mrpaps-catalog.service.js';

export const slugify = mrpapsCatalog.slugify;

export async function listPublicProducts(page = 1, limit = 24) {
  const result = await mrpapsCatalog.listPublicProducts(page, limit);
  return {
    data: result.data.map((p) => ({
      id: p.id,
      slug: p.slug,
      name: p.name,
      thumbnail: p.thumbnail,
      priceFromMxn: p.priceFromMxn,
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
    thumbnail: product.thumbnail,
    variants: product.variants.map((v) => ({
      variantId: v.variantId,
      syncVariantId: v.variantId,
      size: v.size,
      color: v.color,
      retailPriceMxn: v.retailPriceMxn,
      inStock: v.inStock,
    })),
  };
}
