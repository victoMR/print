import * as productsRepo from '../db/mrpaps-products.repository.js';
import { NotFoundError, BadRequestError } from '../types/errors.js';

export function slugify(value: string): string {
  return value
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-|-$/g, '');
}

export async function listPublicProducts(page = 1, limit = 24) {
  const safeLimit = Math.min(Math.max(limit, 1), 48);
  const safePage = Math.max(page, 1);

  const products = await productsRepo.listActiveProducts();
  const total = products.length;
  const start = (safePage - 1) * safeLimit;
  const pageProducts = products.slice(start, start + safeLimit);

  const data = await Promise.all(
    pageProducts.map(async (product) => {
      const variants = await productsRepo.listVariantsByProductId(product.id);
      const prices = variants.map((v) => Number(v.retail_price_mxn)).filter((p) => p > 0);
      const priceFromMxn = prices.length ? Math.min(...prices).toFixed(2) : '0.00';

      return {
        id: product.id,
        slug: product.slug,
        name: product.name,
        thumbnail: product.thumbnail_url,
        priceFromMxn,
        variantCount: variants.length,
      };
    }),
  );

  return { data, meta: { page: safePage, limit: safeLimit, total } };
}

export async function getPublicProduct(idOrSlug: string) {
  let product = await productsRepo.getProductBySlug(idOrSlug);
  if (!product) {
    product = await productsRepo.getProductById(idOrSlug);
  }
  if (!product || product.status !== 'active') {
    throw new NotFoundError('Producto no encontrado');
  }

  const variants = await productsRepo.listVariantsByProductId(product.id);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    thumbnail: product.thumbnail_url,
    variants: variants.map((v) => ({
      variantId: v.id,
      size: v.size_label,
      color: v.color_label,
      retailPriceMxn: Number(v.retail_price_mxn).toFixed(2),
      inStock: v.stock_quantity > 0,
      stockQuantity: v.stock_quantity,
    })),
  };
}

export async function listInventoryAdmin() {
  const variants = await productsRepo.listAllVariantsAdmin();

  return variants.map((v) => ({
    variantId: v.id,
    sku: v.sku,
    productId: v.product.id,
    productName: v.product.name,
    productSlug: v.product.slug,
    size: v.size_label,
    color: v.color_label,
    retailPriceMxn: Number(v.retail_price_mxn).toFixed(2),
    stockQuantity: v.stock_quantity,
    lowStockThreshold: v.low_stock_threshold,
    isLowStock: v.stock_quantity <= v.low_stock_threshold,
    status: v.status,
    designId: v.design_id,
  }));
}

export async function resolveLineItems(
  items: Array<{ variantId: string; quantity: number; retailPriceMxn?: string }>,
) {
  const resolved = [];

  for (const item of items) {
    const variant = await productsRepo.getVariantById(item.variantId);
    if (!variant || variant.status !== 'active' || variant.product.status !== 'active') {
      throw new NotFoundError(`Variante no encontrada: ${item.variantId}`);
    }
    if (variant.stock_quantity < item.quantity) {
      throw new BadRequestError(
        `Stock insuficiente para ${variant.product.name} (${variant.size_label}/${variant.color_label})`,
      );
    }

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
