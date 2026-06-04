import * as ordersRepo from '../db/mrpaps-orders.repository.js';
import * as productsRepo from '../db/mrpaps-products.repository.js';
import type { MrpapsProductVariantRow } from '../db/mrpaps.types.js';
import { BadRequestError, NotFoundError } from '../types/errors.js';
import { slugify } from './mrpaps-catalog.service.js';

export type AdminVariantDto = {
  id: string;
  sku: string;
  size: string;
  color: string;
  retailPriceMxn: string;
  status: string;
  designId: string | null;
  garmentColorHex: string;
  orderItemCount: number;
  sortOrder: number;
};

function toVariantDto(v: MrpapsProductVariantRow, orderItemCount: number): AdminVariantDto {
  return {
    id: v.id,
    sku: v.sku,
    size: v.size_label,
    color: v.color_label,
    retailPriceMxn: Number(v.retail_price_mxn).toFixed(2),
    status: v.status,
    designId: v.design_id,
    garmentColorHex: v.garment_color_hex ?? '#FFFFFF',
    orderItemCount,
    sortOrder: v.sort_order ?? 0,
  };
}

async function variantsWithOrderCounts(
  variants: MrpapsProductVariantRow[],
): Promise<AdminVariantDto[]> {
  const counts = await ordersRepo.countOrderItemsByVariantIds(variants.map((v) => v.id));
  return variants.map((v) => toVariantDto(v, counts[v.id] ?? 0));
}

async function assertUniqueSizeColor(
  productId: string,
  sizeLabel: string,
  colorLabel: string,
  excludeVariantId?: string,
): Promise<void> {
  const existing = await productsRepo.findVariantByProductSizeColor(
    productId,
    sizeLabel,
    colorLabel,
  );
  if (existing && existing.id !== excludeVariantId) {
    throw new BadRequestError(
      `Ya existe la combinación ${sizeLabel} / ${colorLabel} en este producto.`,
    );
  }
}

async function assertUniqueSku(sku: string, excludeVariantId?: string): Promise<void> {
  const existing = await productsRepo.findVariantBySku(sku, excludeVariantId);
  if (existing) {
    throw new BadRequestError(`El SKU «${sku}» ya está en uso.`);
  }
}

export async function getAdminProductWithVariants(productId: string) {
  const product = await productsRepo.getProductById(productId);
  if (!product) throw new NotFoundError('admin.product');

  const variants = await productsRepo.listVariantsByProductIdAdmin(product.id);

  return {
    id: product.id,
    slug: product.slug,
    name: product.name,
    description: product.description,
    thumbnailUrl: product.thumbnail_url,
    status: product.status,
    category: product.category,
    templateId: product.template_id,
    defaultGarmentColor: product.default_garment_color,
    composition: product.composition,
    variants: await variantsWithOrderCounts(variants),
  };
}

export type CreateVariantAdminInput = {
  sku: string;
  sizeLabel: string;
  colorLabel: string;
  retailPriceMxn: number;
  designId?: string | null;
  garmentColorHex?: string;
};

export async function createVariantAdmin(
  productId: string,
  input: CreateVariantAdminInput,
): Promise<AdminVariantDto> {
  const product = await productsRepo.getProductById(productId);
  if (!product) throw new NotFoundError('admin.product');

  const sizeLabel = input.sizeLabel.trim();
  const colorLabel = input.colorLabel.trim();

  const existing = await productsRepo.findVariantByProductSizeColor(
    productId,
    sizeLabel,
    colorLabel,
  );

  if (existing) {
    if (existing.status === 'active') {
      throw new BadRequestError(
        `La talla ${sizeLabel} / ${colorLabel} ya está activa. Edítala o desactívala primero.`,
      );
    }
    await assertUniqueSku(input.sku, existing.id);
    const row = await productsRepo.updateVariantAdmin(existing.id, {
      status: 'active',
      retail_price_mxn: input.retailPriceMxn,
      sku: input.sku,
      design_id: input.designId ?? existing.design_id,
      garment_color_hex:
        input.garmentColorHex ?? existing.garment_color_hex ?? product.default_garment_color,
    });
    const counts = await ordersRepo.countOrderItemsByVariantIds([row.id]);
    return toVariantDto(row, counts[row.id] ?? 0);
  }

  await assertUniqueSku(input.sku);

  const row = await productsRepo.upsertVariant({
    product_id: product.id,
    sku: input.sku,
    size_label: sizeLabel,
    color_label: colorLabel,
    retail_price_mxn: input.retailPriceMxn,
    stock_quantity: 0,
    design_id: input.designId ?? null,
    garment_color_hex: input.garmentColorHex ?? product.default_garment_color ?? '#FFFFFF',
  });

  const counts = await ordersRepo.countOrderItemsByVariantIds([row.id]);
  return toVariantDto(row, counts[row.id] ?? 0);
}

export type UpdateVariantAdminInput = {
  sku?: string;
  sizeLabel?: string;
  colorLabel?: string;
  retailPriceMxn?: number;
  designId?: string | null;
  garmentColorHex?: string;
  status?: 'active' | 'inactive' | 'archived';
};

export async function updateVariantAdmin(
  variantId: string,
  input: UpdateVariantAdminInput,
): Promise<AdminVariantDto> {
  const current = await productsRepo.getVariantById(variantId);
  if (!current) throw new NotFoundError('admin.variant');

  const counts = await ordersRepo.countOrderItemsByVariantIds([variantId]);
  const orderItemCount = counts[variantId] ?? 0;

  if (input.status === 'archived' && orderItemCount > 0) {
    throw new BadRequestError(
      `Esta variante tiene ${orderItemCount} línea(s) en pedidos. Desactívala (inactiva) en lugar de archivarla.`,
    );
  }

  const nextSize = input.sizeLabel?.trim() ?? current.size_label;
  const nextColor = input.colorLabel?.trim() ?? current.color_label;

  if (input.sizeLabel !== undefined || input.colorLabel !== undefined) {
    await assertUniqueSizeColor(current.product_id, nextSize, nextColor, variantId);
  }

  if (input.sku !== undefined) {
    await assertUniqueSku(input.sku, variantId);
  }

  const patch: Parameters<typeof productsRepo.updateVariantAdmin>[1] = {};
  if (input.sku !== undefined) patch.sku = input.sku;
  if (input.sizeLabel !== undefined) patch.size_label = nextSize;
  if (input.colorLabel !== undefined) patch.color_label = nextColor;
  if (input.retailPriceMxn !== undefined) patch.retail_price_mxn = input.retailPriceMxn;
  if (input.designId !== undefined) patch.design_id = input.designId;
  if (input.garmentColorHex !== undefined) patch.garment_color_hex = input.garmentColorHex;
  if (input.status !== undefined) patch.status = input.status;

  const row = await productsRepo.updateVariantAdmin(variantId, patch);
  return toVariantDto(row, orderItemCount);
}

/** SKU sugerido para una nueva variante. */
export function suggestVariantSku(productSlug: string, size: string, color: string): string {
  const base = `${productSlug}-${slugify(size)}-${slugify(color)}`.slice(0, 50);
  return base || `MRP-${Date.now().toString(36)}`;
}
