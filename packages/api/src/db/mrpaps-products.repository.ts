import { query, queryOne, queryRequired, buildUpdateSet } from '../lib/db-helper.js';
import type {
  MrpapsProductRow,
  MrpapsProductStatus,
  MrpapsProductCategory,
  MrpapsProductVariantRow,
  MrpapsVariantWithProduct,
} from './mrpaps.types.js';

function escapeIlikePattern(term: string): string {
  return term.replace(/[%_\\]/g, (ch) => `\\${ch}`);
}

export async function listActiveProducts(
  category?: MrpapsProductCategory,
  search?: string,
): Promise<MrpapsProductRow[]> {
  const params: unknown[] = [];
  let sql = `SELECT * FROM mrpaps_products WHERE status = 'active'`;

  if (category) {
    params.push(category);
    sql += ` AND category = $${params.length}`;
  }

  const trimmedSearch = search?.trim();
  if (trimmedSearch) {
    params.push(`%${escapeIlikePattern(trimmedSearch)}%`);
    const idx = params.length;
    sql += ` AND (name ILIKE $${idx} ESCAPE '\\' OR slug ILIKE $${idx} ESCAPE '\\' OR COALESCE(description, '') ILIKE $${idx} ESCAPE '\\')`;
  }

  sql += ` ORDER BY name`;
  return query<MrpapsProductRow>(sql, params);
}

export async function listProductsAdmin(): Promise<MrpapsProductRow[]> {
  return query<MrpapsProductRow>(
    `SELECT * FROM mrpaps_products WHERE status <> 'archived' ORDER BY name`,
  );
}

export async function getProductBySlug(slug: string): Promise<MrpapsProductRow | null> {
  return queryOne<MrpapsProductRow>(
    `SELECT * FROM mrpaps_products WHERE slug = $1 AND status = 'active'`,
    [slug],
  );
}

export async function getProductById(id: string): Promise<MrpapsProductRow | null> {
  return queryOne<MrpapsProductRow>(`SELECT * FROM mrpaps_products WHERE id = $1`, [id]);
}

export async function listVariantsByProductId(productId: string): Promise<MrpapsProductVariantRow[]> {
  return query<MrpapsProductVariantRow>(
    `SELECT * FROM mrpaps_product_variants
     WHERE product_id = $1 AND status = 'active'
     ORDER BY sort_order`,
    [productId],
  );
}

export async function listVariantsByProductIdAdmin(
  productId: string,
): Promise<MrpapsProductVariantRow[]> {
  return query<MrpapsProductVariantRow>(
    `SELECT * FROM mrpaps_product_variants
     WHERE product_id = $1 AND status <> 'archived'
     ORDER BY sort_order`,
    [productId],
  );
}

export async function updateProductAdmin(
  productId: string,
  patch: Partial<{
    slug: string;
    name: string;
    description: string;
    thumbnail_url: string;
    status: MrpapsProductStatus;
    template_id: string | null;
    composition: Record<string, unknown>;
    default_garment_color: string;
    category?: MrpapsProductCategory;
  }>,
): Promise<MrpapsProductRow> {
  const { clause, values } = buildUpdateSet(patch);
  return queryRequired<MrpapsProductRow>(
    `UPDATE mrpaps_products SET ${clause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [productId, ...values],
  );
}

function mapVariantWithProduct(row: MrpapsProductVariantRow & { product: MrpapsProductRow }): MrpapsVariantWithProduct {
  const { product, ...variant } = row;
  return { ...variant, product };
}

export async function listAllVariantsAdmin(): Promise<MrpapsVariantWithProduct[]> {
  const rows = await query<MrpapsProductVariantRow & { product: MrpapsProductRow }>(
    `SELECT v.*, row_to_json(p.*)::jsonb AS product
     FROM mrpaps_product_variants v
     JOIN mrpaps_products p ON p.id = v.product_id
     WHERE v.status <> 'archived'
     ORDER BY v.sku`,
  );
  return rows.map((row) => mapVariantWithProduct(row));
}

export async function getVariantById(id: string): Promise<MrpapsVariantWithProduct | null> {
  const row = await queryOne<MrpapsProductVariantRow & { product: MrpapsProductRow }>(
    `SELECT v.*, row_to_json(p.*)::jsonb AS product
     FROM mrpaps_product_variants v
     JOIN mrpaps_products p ON p.id = v.product_id
     WHERE v.id = $1`,
    [id],
  );
  return row ? mapVariantWithProduct(row) : null;
}

export async function updateVariantStock(
  variantId: string,
  stockQuantity: number,
): Promise<MrpapsProductVariantRow> {
  return queryRequired<MrpapsProductVariantRow>(
    `UPDATE mrpaps_product_variants
     SET stock_quantity = $2, updated_at = NOW()
     WHERE id = $1
     RETURNING *`,
    [variantId, stockQuantity],
  );
}

export async function findVariantByProductSizeColor(
  productId: string,
  sizeLabel: string,
  colorLabel: string,
): Promise<MrpapsProductVariantRow | null> {
  return queryOne<MrpapsProductVariantRow>(
    `SELECT * FROM mrpaps_product_variants
     WHERE product_id = $1 AND size_label = $2 AND color_label = $3`,
    [productId, sizeLabel, colorLabel],
  );
}

export async function findVariantBySku(
  sku: string,
  excludeVariantId?: string,
): Promise<MrpapsProductVariantRow | null> {
  if (excludeVariantId) {
    return queryOne<MrpapsProductVariantRow>(
      `SELECT * FROM mrpaps_product_variants WHERE sku = $1 AND id <> $2`,
      [sku, excludeVariantId],
    );
  }
  return queryOne<MrpapsProductVariantRow>(
    `SELECT * FROM mrpaps_product_variants WHERE sku = $1`,
    [sku],
  );
}

export async function updateVariantAdmin(
  variantId: string,
  patch: Partial<{
    sku: string;
    size_label: string;
    color_label: string;
    retail_price_mxn: number;
    stock_quantity: number;
    status: MrpapsProductStatus;
    design_id: string | null;
    garment_color_hex: string;
    sort_order: number;
  }>,
): Promise<MrpapsProductVariantRow> {
  const { clause, values } = buildUpdateSet(patch);
  return queryRequired<MrpapsProductVariantRow>(
    `UPDATE mrpaps_product_variants SET ${clause}, updated_at = NOW() WHERE id = $1 RETURNING *`,
    [variantId, ...values],
  );
}

export async function upsertProduct(input: {
  slug: string;
  name: string;
  description: string;
  thumbnail_url: string;
  status?: MrpapsProductStatus;
  template_id?: string | null;
  composition?: Record<string, unknown>;
  default_garment_color?: string;
  category?: MrpapsProductCategory;
}): Promise<MrpapsProductRow> {
  return queryRequired<MrpapsProductRow>(
    `INSERT INTO mrpaps_products (
       slug, name, description, thumbnail_url, status, template_id, composition,
       default_garment_color, category
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
     ON CONFLICT (slug) DO UPDATE SET
       name = EXCLUDED.name,
       description = EXCLUDED.description,
       thumbnail_url = EXCLUDED.thumbnail_url,
       status = EXCLUDED.status,
       template_id = EXCLUDED.template_id,
       composition = EXCLUDED.composition,
       default_garment_color = EXCLUDED.default_garment_color,
       category = EXCLUDED.category,
       updated_at = NOW()
     RETURNING *`,
    [
      input.slug,
      input.name,
      input.description,
      input.thumbnail_url,
      input.status ?? 'active',
      input.template_id ?? null,
      JSON.stringify(input.composition ?? {}),
      input.default_garment_color ?? '#FFFFFF',
      input.category ?? 'camiseta',
    ],
  );
}

export async function upsertVariant(input: {
  product_id: string;
  sku: string;
  size_label: string;
  color_label: string;
  retail_price_mxn: number;
  stock_quantity: number;
  design_id?: string | null;
  garment_color_hex?: string;
}): Promise<MrpapsProductVariantRow> {
  return queryRequired<MrpapsProductVariantRow>(
    `INSERT INTO mrpaps_product_variants (
       product_id, sku, size_label, color_label, retail_price_mxn, stock_quantity,
       design_id, garment_color_hex, status
     ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'active')
     ON CONFLICT (sku) DO UPDATE SET
       product_id = EXCLUDED.product_id,
       size_label = EXCLUDED.size_label,
       color_label = EXCLUDED.color_label,
       retail_price_mxn = EXCLUDED.retail_price_mxn,
       stock_quantity = EXCLUDED.stock_quantity,
       design_id = EXCLUDED.design_id,
       garment_color_hex = EXCLUDED.garment_color_hex,
       status = 'active',
       updated_at = NOW()
     RETURNING *`,
    [
      input.product_id,
      input.sku,
      input.size_label,
      input.color_label,
      input.retail_price_mxn,
      input.stock_quantity,
      input.design_id ?? null,
      input.garment_color_hex ?? '#FFFFFF',
    ],
  );
}
