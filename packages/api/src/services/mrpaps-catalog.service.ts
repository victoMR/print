import * as productsRepo from '../db/mrpaps-products.repository.js';
import * as templatesRepo from '../db/mrpaps-garment-templates.repository.js';
import { NotFoundError, BadRequestError } from '../types/errors.js';

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

export async function listPublicProducts(page = 1, limit = 24) {
  const safeLimit = Math.min(Math.max(limit, 1), 48);
  const safePage = Math.max(page, 1);

  const products = await productsRepo.listActiveProducts();
  const total = products.length;
  const start = (safePage - 1) * safeLimit;
  const pageProducts = products.slice(start, start + safeLimit);

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
          thumbnail: product.thumbnail_url,
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

  return { data, meta: { page: safePage, limit: safeLimit, total: data.length } };
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
  const preview = await buildProductPreview(product);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    thumbnail: product.thumbnail_url,
    preview,
    variants: variants.map((v) => ({
      variantId: v.id,
      size: v.size_label,
      color: v.color_label,
      retailPriceMxn: Number(v.retail_price_mxn).toFixed(2),
      garmentColorHex: v.garment_color_hex ?? product.default_garment_color ?? '#FFFFFF',
      inStock: true,
    })),
  };
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
