import { z } from 'zod';

export const MRPAPS_PRODUCT_CATEGORIES = [
  'camiseta',
  'sudadera',
  'gorra',
  'tenis',
] as const;

export type MrpapsProductCategory = (typeof MRPAPS_PRODUCT_CATEGORIES)[number];

export const productCategorySchema = z.enum(MRPAPS_PRODUCT_CATEGORIES);

export const PRODUCT_CATEGORY_LABELS: Record<MrpapsProductCategory, string> = {
  camiseta: 'Camisetas',
  sudadera: 'Sudaderas',
  gorra: 'Gorras',
  tenis: 'Tenis',
};

/** Sugerencia al elegir plantilla en el compositor. */
export function categoryFromGarmentType(
  garmentType: 'tshirt' | 'hoodie' | 'cap',
): MrpapsProductCategory {
  const map: Record<typeof garmentType, MrpapsProductCategory> = {
    tshirt: 'camiseta',
    hoodie: 'sudadera',
    cap: 'gorra',
  };
  return map[garmentType];
}
