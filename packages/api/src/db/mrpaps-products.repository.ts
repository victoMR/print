import { supabase } from '../lib/supabase.js';
import type {
  MrpapsProductRow,
  MrpapsProductStatus,
  MrpapsProductVariantRow,
  MrpapsVariantWithProduct,
} from './mrpaps.types.js';

export async function listActiveProducts(): Promise<MrpapsProductRow[]> {
  const { data, error } = await supabase
    .from('mrpaps_products')
    .select('*')
    .eq('status', 'active')
    .order('name');

  if (error) throw error;
  return (data ?? []) as MrpapsProductRow[];
}

export async function listProductsAdmin(): Promise<MrpapsProductRow[]> {
  const { data, error } = await supabase
    .from('mrpaps_products')
    .select('*')
    .neq('status', 'archived')
    .order('name');

  if (error) throw error;
  return (data ?? []) as MrpapsProductRow[];
}

export async function getProductBySlug(slug: string): Promise<MrpapsProductRow | null> {
  const { data, error } = await supabase
    .from('mrpaps_products')
    .select('*')
    .eq('slug', slug)
    .eq('status', 'active')
    .maybeSingle();

  if (error) throw error;
  return data as MrpapsProductRow | null;
}

export async function getProductById(id: string): Promise<MrpapsProductRow | null> {
  const { data, error } = await supabase
    .from('mrpaps_products')
    .select('*')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  return data as MrpapsProductRow | null;
}

export async function listVariantsByProductId(productId: string): Promise<MrpapsProductVariantRow[]> {
  const { data, error } = await supabase
    .from('mrpaps_product_variants')
    .select('*')
    .eq('product_id', productId)
    .eq('status', 'active')
    .order('sort_order');

  if (error) throw error;
  return (data ?? []) as MrpapsProductVariantRow[];
}

export async function listVariantsByProductIdAdmin(productId: string): Promise<MrpapsProductVariantRow[]> {
  const { data, error } = await supabase
    .from('mrpaps_product_variants')
    .select('*')
    .eq('product_id', productId)
    .neq('status', 'archived')
    .order('sort_order');

  if (error) throw error;
  return (data ?? []) as MrpapsProductVariantRow[];
}

export async function updateProductAdmin(
  productId: string,
  patch: Partial<{
    slug: string;
    name: string;
    description: string;
    thumbnail_url: string;
    status: MrpapsProductStatus;
  }>,
): Promise<MrpapsProductRow> {
  const { data, error } = await supabase
    .from('mrpaps_products')
    .update(patch)
    .eq('id', productId)
    .select('*')
    .single();

  if (error) throw error;
  return data as MrpapsProductRow;
}

export async function listAllVariantsAdmin(): Promise<MrpapsVariantWithProduct[]> {
  const { data, error } = await supabase
    .from('mrpaps_product_variants')
    .select('*, product:mrpaps_products(*)')
    .neq('status', 'archived')
    .order('sku');

  if (error) throw error;
  return (data ?? []).map((row) => {
    const { product, ...variant } = row as MrpapsProductVariantRow & { product: MrpapsProductRow };
    return { ...variant, product };
  });
}

export async function getVariantById(id: string): Promise<MrpapsVariantWithProduct | null> {
  const { data, error } = await supabase
    .from('mrpaps_product_variants')
    .select('*, product:mrpaps_products(*)')
    .eq('id', id)
    .maybeSingle();

  if (error) throw error;
  if (!data) return null;

  const { product, ...variant } = data as MrpapsProductVariantRow & { product: MrpapsProductRow };
  return { ...variant, product };
}

export async function updateVariantStock(
  variantId: string,
  stockQuantity: number,
): Promise<MrpapsProductVariantRow> {
  const { data, error } = await supabase
    .from('mrpaps_product_variants')
    .update({ stock_quantity: stockQuantity })
    .eq('id', variantId)
    .select('*')
    .single();

  if (error) throw error;
  return data as MrpapsProductVariantRow;
}

export async function updateVariantAdmin(
  variantId: string,
  patch: Partial<{
    retail_price_mxn: number;
    stock_quantity: number;
    status: MrpapsProductStatus;
    design_id: string | null;
  }>,
): Promise<MrpapsProductVariantRow> {
  const { data, error } = await supabase
    .from('mrpaps_product_variants')
    .update(patch)
    .eq('id', variantId)
    .select('*')
    .single();

  if (error) throw error;
  return data as MrpapsProductVariantRow;
}

export async function upsertProduct(input: {
  slug: string;
  name: string;
  description: string;
  thumbnail_url: string;
  status?: MrpapsProductStatus;
}): Promise<MrpapsProductRow> {
  const { data, error } = await supabase
    .from('mrpaps_products')
    .upsert(
      {
        slug: input.slug,
        name: input.name,
        description: input.description,
        thumbnail_url: input.thumbnail_url,
        status: input.status ?? 'active',
      },
      { onConflict: 'slug' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as MrpapsProductRow;
}

export async function upsertVariant(input: {
  product_id: string;
  sku: string;
  size_label: string;
  color_label: string;
  retail_price_mxn: number;
  stock_quantity: number;
  design_id?: string | null;
}): Promise<MrpapsProductVariantRow> {
  const { data, error } = await supabase
    .from('mrpaps_product_variants')
    .upsert(
      {
        product_id: input.product_id,
        sku: input.sku,
        size_label: input.size_label,
        color_label: input.color_label,
        retail_price_mxn: input.retail_price_mxn,
        stock_quantity: input.stock_quantity,
        design_id: input.design_id ?? null,
        status: 'active',
      },
      { onConflict: 'sku' },
    )
    .select('*')
    .single();

  if (error) throw error;
  return data as MrpapsProductVariantRow;
}
